using System;
using System.Collections.Generic;
using System.Linq;
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

        public Task CheckAndAdvanceOperatorAsync(string operatorId)
        {
            return Task.Run(() => 
            {
                var op = _operatorRepo.GetById(operatorId);
                if (op == null) return;

                // Determine Current Status
                StatusType currentStatusType = null;
                if (!string.IsNullOrEmpty(op.StatusId))
                {
                    currentStatusType = _statusTypeRepo.GetById(op.StatusId);
                }
                
                // Fallback: match by StatusName and DivisionId
                if (currentStatusType == null && !string.IsNullOrEmpty(op.StatusName))
                {
                    var divStatusTypes = _statusTypeRepo.GetByDivision(op.DivisionId);
                    currentStatusType = divStatusTypes
                        .FirstOrDefault(s => s.Status != null && s.Status.Equals(op.StatusName, StringComparison.OrdinalIgnoreCase));
                }

                if (currentStatusType == null) return;

                // Get PizzaStatus
                var pizzaStatus = _pizzaStatusRepo.GetByStatus(currentStatusType.Status);
                if (pizzaStatus == null) return;

                // Check IsAuto
                if (!pizzaStatus.IsAuto) return;

                // Check Requirements
                var requirements = _requirementRepo.GetAll();
                var specificRequirement = requirements
                    .FirstOrDefault(r => r.PizzaStatusId == pizzaStatus.Id && r.Division == op.DivisionId);

                // If requirements exist, verify them
                if (specificRequirement != null && specificRequirement.RequiredCertifications != null && specificRequirement.RequiredCertifications.Any())
                {
                    var opCerts = _certRepo.GetAll()
                        .Where(c => c.OperatorId == op.Id && c.IsDeleted != "1" && c.IsApproved == "1")
                        .ToList();


                    var heldCertTypes = opCerts
                        .Select(c => c.CertTypeId)
                        .Where(id => !string.IsNullOrEmpty(id))
                        .ToHashSet();

                    bool allMet = specificRequirement.RequiredCertifications.All(reqCertId => heldCertTypes.Contains(reqCertId));
                    
                    if (!allMet) return;
                }

                // Advance to Next Status
                if (int.TryParse(currentStatusType.OrderId, out int currentOrder))
                {
                    int nextOrder = currentOrder + 1;
                    var nextStatusType = _statusTypeRepo.GetByDivision(op.DivisionId)
                                            .FirstOrDefault(s => int.TryParse(s.OrderId, out int o) && o == nextOrder);
                    
                    if (nextStatusType != null)
                    {
                        op.StatusId = nextStatusType.Id;
                        op.StatusName = nextStatusType.Status;
                        op.OrderId = nextStatusType.OrderId;
                        
                        _operatorRepo.Save(op);
                    }
                }
            });
        }
    }
}
