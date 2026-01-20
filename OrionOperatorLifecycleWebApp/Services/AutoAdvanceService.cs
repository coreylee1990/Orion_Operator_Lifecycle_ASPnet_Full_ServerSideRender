using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class AutoAdvanceService : IAutoAdvanceService
    {
        private readonly IOperatorRepository _operatorRepo;
        private readonly IStatusTypeRepository _statusTypeRepo;
        private readonly IPizzaStatusRepository _pizzaStatusRepo;
        private readonly IRequirementRepository _requirementRepo;
        private readonly ICertificationRepository _certRepo;

        public AutoAdvanceService(
            IOperatorRepository operatorRepo,
            IStatusTypeRepository statusTypeRepo,
            IPizzaStatusRepository pizzaStatusRepo,
            IRequirementRepository requirementRepo,
            ICertificationRepository certRepo)
        {
            _operatorRepo = operatorRepo;
            _statusTypeRepo = statusTypeRepo;
            _pizzaStatusRepo = pizzaStatusRepo;
            _requirementRepo = requirementRepo;
            _certRepo = certRepo;
        }

        public Task<AutoAdvanceResult?> AdvanceOperatorIfEligibleAsync(
            string operatorId,
            string? reason = null,
            CancellationToken cancellationToken = default)
        {
            return Task.Run(() =>
            {
                if (string.IsNullOrWhiteSpace(operatorId))
                {
                    return (AutoAdvanceResult?)null;
                }

                var op = _operatorRepo.GetById(operatorId);
                if (op == null)
                {
                    return (AutoAdvanceResult?)null;
                }

                return AdvanceOperatorInternal(op, reason);
            }, cancellationToken);
        }

        public Task<IReadOnlyList<AutoAdvanceResult>> RecalculateAndAdvanceDivisionAsync(
            string clientId,
            string divisionId,
            CancellationToken cancellationToken = default)
        {
            return Task.Run(() =>
            {
                var results = new List<AutoAdvanceResult>();

                // Scope by division when provided; otherwise process all operators.
                var operators = string.IsNullOrWhiteSpace(divisionId)
                    ? _operatorRepo.GetAll()
                    : _operatorRepo.GetByDivision(divisionId);

                foreach (var op in operators)
                {
                    if (cancellationToken.IsCancellationRequested)
                    {
                        break;
                    }

                    var result = AdvanceOperatorInternal(op, "BulkRecalc");
                    if (result != null)
                    {
                        results.Add(result);
                    }
                }

                return (IReadOnlyList<AutoAdvanceResult>)results;
            }, cancellationToken);
        }

        public Task<StatusType?> GetNextStatusForOperatorAsync(string operatorId)
        {
            return Task.Run(() =>
            {
                if (string.IsNullOrWhiteSpace(operatorId)) return (StatusType?)null;

                var op = _operatorRepo.GetById(operatorId);
                if (op == null)
                {
                    return (StatusType?)null;
                }

                var currentStatusType = ResolveCurrentStatusType(op);
                if (currentStatusType == null)
                {
                    return (StatusType?)null;
                }

                return GetNextStatusTypeForOperator(op, currentStatusType);
            });
        }

        private AutoAdvanceResult? AdvanceOperatorInternal(Operator op, string? reason)
        {
            if (op == null || string.IsNullOrWhiteSpace(op.Id))
            {
                return null;
            }

            var currentStatusType = ResolveCurrentStatusType(op);
            if (currentStatusType == null)
            {
                return new AutoAdvanceResult
                {
                    OperatorId = op.Id,
                    FromStatusId = op.StatusId,
                    ToStatusId = null,
                    Changed = false,
                    Reason = "Current status not found"
                };
            }

            // Get PizzaStatus backing this status type.
            var pizzaStatus = _pizzaStatusRepo.GetByStatus(currentStatusType.Status);
            if (pizzaStatus == null || !pizzaStatus.IsAuto)
            {
                return new AutoAdvanceResult
                {
                    OperatorId = op.Id,
                    FromStatusId = op.StatusId,
                    ToStatusId = null,
                    Changed = false,
                    Reason = "Status is not auto-advance eligible"
                };
            }

            // Check requirements, if any.
            var requirement = _requirementRepo.GetByPizzaStatusAndDivision(pizzaStatus.Id, op.DivisionId ?? string.Empty);
            if (requirement != null &&
                requirement.RequiredCertifications != null &&
                requirement.RequiredCertifications.Any())
            {
                var opCerts = _certRepo
                    .GetByOperatorIds(new List<string> { op.Id })
                    .Where(c => c.IsDeleted != true && c.IsApproved == true)
                    .ToList();

                var heldCertTypes = opCerts
                    .Select(c => c.CertTypeId)
                    .Where(id => !string.IsNullOrEmpty(id))
                    .ToHashSet();

                var allMet = requirement.RequiredCertifications
                    .All(reqCertId => heldCertTypes.Contains(reqCertId));

                if (!allMet)
                {
                    return new AutoAdvanceResult
                    {
                        OperatorId = op.Id,
                        FromStatusId = op.StatusId,
                        ToStatusId = null,
                        Changed = false,
                        Reason = "Requirements not met"
                    };
                }
            }

            // Determine next status type using the same rules as the Requirements editor
            // (ordered by OrderId and skipping same PizzaStatusId).
            var nextStatusType = GetNextStatusTypeForOperator(op, currentStatusType);
            if (nextStatusType == null)
            {
                return new AutoAdvanceResult
                {
                    OperatorId = op.Id,
                    FromStatusId = op.StatusId,
                    ToStatusId = null,
                    Changed = false,
                    Reason = "No valid next status found"
                };
            }

            // Persist using the standard status update path.
            _operatorRepo.UpdateStatus(op.Id, nextStatusType.Status, nextStatusType.Id, nextStatusType.OrderId);

            return new AutoAdvanceResult
            {
                OperatorId = op.Id,
                FromStatusId = op.StatusId,
                ToStatusId = nextStatusType.Id,
                Changed = true,
                Reason = string.IsNullOrWhiteSpace(reason) ? "AutoAdvance" : reason
            };
        }

        private StatusType? ResolveCurrentStatusType(Operator op)
        {
            StatusType? currentStatusType = null;

            if (!string.IsNullOrEmpty(op.StatusId))
            {
                currentStatusType = _statusTypeRepo.GetById(op.StatusId);
            }

            // Fallback: match by Status text and DivisionId
            if (currentStatusType == null && !string.IsNullOrEmpty(op.Status))
            {
                var divStatusTypes = _statusTypeRepo.GetByDivision(op.DivisionId);
                currentStatusType = divStatusTypes
                    .FirstOrDefault(s =>
                        s.Status != null &&
                        s.Status.Equals(op.Status, StringComparison.OrdinalIgnoreCase));
            }

            return currentStatusType;
        }

        private StatusType? GetNextStatusTypeForOperator(Operator op, StatusType currentStatusType)
        {
            if (op == null || currentStatusType == null)
            {
                return null;
            }

            var divisionId = op.DivisionId;
            if (string.IsNullOrEmpty(divisionId))
            {
                return null;
            }

            var allStatusesForDivision = _statusTypeRepo.GetByDivision(divisionId) ?? new List<StatusType>();
            if (!allStatusesForDivision.Any())
            {
                return null;
            }

            int ParseOrder(StatusType st)
            {
                if (st == null) return 0;
                return int.TryParse(st.OrderId, out var o) ? o : 0;
            }

            var currentOrder = ParseOrder(currentStatusType);
            var currentPizzaStatusId = currentStatusType.PizzaStatusId;

            StatusType? candidate = null;

            foreach (var st in allStatusesForDivision)
            {
                if (st == null || string.IsNullOrEmpty(st.Status)) continue;

                var order = ParseOrder(st);
                if (order <= currentOrder) continue;

                // Skip same PizzaStatusId to mirror Requirements editor auto-advance behavior
                if (!string.IsNullOrEmpty(currentPizzaStatusId) &&
                    !string.IsNullOrEmpty(st.PizzaStatusId) &&
                    string.Equals(st.PizzaStatusId, currentPizzaStatusId, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (candidate == null || ParseOrder(st) < ParseOrder(candidate))
                {
                    candidate = st;
                }
            }

            return candidate;
        }
    }
}
