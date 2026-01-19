
using Microsoft.AspNetCore.Mvc;
using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Services;
using System;
using System.Collections.Generic;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Controllers
{
    public class RequirementsController : Controller
    {
        private readonly IOperatorService _operatorService;
        private readonly ICertificationService _certificationService;
        private readonly IPizzaStatusService _pizzaStatusService;
        private readonly IStatusTypeService _statusTypeService;
        private readonly IRequirementService _requirementService;
        private readonly ICertTypeService _certTypeService;
        private readonly IStatusTrackerService _statusTrackerService;

        public RequirementsController(
            IOperatorService operatorService,
            ICertificationService certificationService,
            IPizzaStatusService pizzaStatusService,
            IStatusTypeService statusTypeService,
            IRequirementService requirementService,
            ICertTypeService certTypeService,
            IStatusTrackerService statusTrackerService)
        {
            _operatorService = operatorService;
            _certificationService = certificationService;
            _pizzaStatusService = pizzaStatusService;
            _statusTypeService = statusTypeService;
            _requirementService = requirementService;
            _certTypeService = certTypeService;
            _statusTrackerService = statusTrackerService;
        }

        // GET: /Requirements/
        public IActionResult Index()
        {
            // Don't load all operators upfront - they will be loaded per division
            var model = new RequirementsEditorViewModel
            {
                Operators = new List<Operator>(), // Empty initially
                Certifications = new List<Certification>(), // Empty initially  
                PizzaStatuses = _pizzaStatusService.GetAllPizzaStatuses(),
                StatusTypes = _statusTypeService.GetAllStatusTypes(),
                Requirements = _requirementService.GetAllRequirements()
            };
            return View(model);
        }

        // GET: /Requirements/ByDivision/{divisionId}
        public IActionResult ByDivision(string divisionId)
        {
            var operators = _operatorService.GetOperatorsByDivision(divisionId);
            var statusTypes = _statusTypeService.GetStatusTypesByDivision(divisionId);
            var certifications = _certificationService.GetCertificationsByDivision(divisionId);
            return Json(new { operators, statusTypes, certifications });
        }

        // GET: /Requirements/GetOperatorsByDivisionWithCerts?divisionId=5 - CA
        [HttpGet]
        public IActionResult GetOperatorsByDivisionWithCerts(string divisionId)
        {
            List<Operator> operators;

            if (string.IsNullOrEmpty(divisionId) || divisionId == "ALL")
            {
                // Load ALL operators (already includes certs from repository)
                operators = _operatorService.GetAllOperators();
            }
            else
            {
                // Load only operators for this division (optimized query with certs included)
                operators = _operatorService.GetOperatorsByDivision(divisionId);
            }

            // Certifications are already loaded with operators from the repository
            // No need to load separately - this eliminates an extra DB query
            var certifications = operators.SelectMany(op => op.Certifications ?? new List<Certification>()).ToList();

            return Json(new { operators, certifications });
        }

        // GET: /Requirements/RequirementForStatus?pizzaStatusId=1&division=DIV1

        public IActionResult RequirementForStatus(string pizzaStatusId, string division)
        {
            var req = _requirementService.GetRequirement(pizzaStatusId, division);
            return Json(req);
        }

        // POST: /Requirements/SaveAll
        [HttpPost]
        public IActionResult SaveAll([FromBody] List<Requirement> requirements)
        {
            _requirementService.SaveAllRequirements(requirements);
            return Ok();
        }

        // GET: /Requirements/RenderOperatorCard?operatorId=123&statusName=Training&divisionId=5 - CA&statusIndex=2&pizzaStatusId=guid
        public IActionResult RenderOperatorCard(string operatorId, string statusName, string divisionId, int statusIndex = 0, string pizzaStatusId = null)
        {
            var op = _operatorService.GetOperatorById(operatorId);
            if (op == null)
            {
                return NotFound();
            }

            // Load certifications only for this operator (avoid full-table scan)
            var opCertifications = _certificationService.GetCertificationsByOperatorIds(new List<string> { operatorId });
            op.Certifications = opCertifications ?? new List<Certification>();

            // Use the divisionId parameter from the workflow context (not operator's stored division)
            // This ensures we look up certs for the correct division context
            var workflowDivision = divisionId ?? "";
            var opStatus = op.Status ?? "";

            // If pizzaStatusId is provided from the workflow step, use it directly
            // Otherwise, find the operator's current status PizzaStatusId
            string finalPizzaStatusId = pizzaStatusId;
            
            if (string.IsNullOrEmpty(finalPizzaStatusId))
            {
                // Find the status PizzaStatusId in the workflow division context
                var allStatusTypes = _statusTypeService.GetAllStatusTypes();
                
                var statusType = allStatusTypes.FirstOrDefault(st => 
                    st.Status == opStatus && 
                    st.DivisionId == workflowDivision
                );

                if (statusType == null || string.IsNullOrEmpty(statusType.PizzaStatusId))
                {
                    // Try case-insensitive
                    statusType = allStatusTypes.FirstOrDefault(st => 
                        string.Equals(st.Status, opStatus, StringComparison.OrdinalIgnoreCase) && 
                        st.DivisionId == workflowDivision
                    );
                    
                    if (statusType == null || string.IsNullOrEmpty(statusType.PizzaStatusId))
                    {
                        ViewBag.ValidCount = 0;
                        ViewBag.MissingCount = 0;
                        ViewBag.HasAllRequiredCerts = false;
                        ViewBag.DaysInStatus = null;
                        return PartialView("_OperatorCard", op);
                    }
                }

                finalPizzaStatusId = statusType.PizzaStatusId;
            }

            // Get all cert types for this PizzaStatusId in the workflow division (not operator's division)
            var allCertTypes = _certTypeService.GetAllCertTypes();
            var pizzaStatusCertTypes = allCertTypes
                .Where(ct => 
                    ct.PizzaStatusId == finalPizzaStatusId && 
                    ct.DivisionId == workflowDivision && 
                    ct.IsDeleted != true
                )
                .ToList();

            // Build cert status map
            int currentValid = 0;
            int currentMissing = 0;

            foreach (var certType in pizzaStatusCertTypes)
            {
                var certName = certType.Certification;
                var certTypeId = certType.Id;
                
                // Find approved cert for this operator by matching CertTypeID
                var cert = (op.Certifications ?? new List<Certification>()).FirstOrDefault(c =>
                {
                    // Match by CertTypeID
                    if (c.CertTypeId != certTypeId) return false;
                    // Must not be deleted (null or false)
                    if (c.IsDeleted == true) return false;
                    // Must be approved (true, not null or false)
                    if (c.IsApproved != true) return false;
                    return true;
                });

                if (cert != null)
                {
                    currentValid++;
                }
                else
                {
                    currentMissing++;
                }
            }

            // Stats for current PizzaStatus only
            ViewBag.ValidCount = currentValid;
            ViewBag.MissingCount = currentMissing;

            // Flag when operator has all required certs for this status
            var hasAllRequiredCerts = currentMissing == 0 && pizzaStatusCertTypes.Count > 0;
            ViewBag.HasAllRequiredCerts = hasAllRequiredCerts;
            
            // Calculate days in status using operator's current StatusID
            ViewBag.DaysInStatus = _statusTrackerService.GetDaysInStatus(op.Id, op.StatusId ?? "");

            return PartialView("_OperatorCard", op);
        }

        // GET: /Requirements/RenderCertBadge?certName=CPR&statusName=Training
        public IActionResult RenderCertBadge(string certName, string statusName)
        {
            ViewBag.StatusName = statusName;
            return PartialView("_CertificationBadge", certName);
        }

        // GET: /Requirements/RenderCertDetails?certName=CPR&division=5 - CA
        public IActionResult RenderCertDetails(string certName, string division)
        {
            var viewModel = new Models.ViewModels.CertificationDetailsViewModel
            {
                CertName = certName,
                Division = division
            };

            // Find the certType for this cert name in the specified division
            var allCertTypes = _certTypeService.GetAllCertTypes();
            var certType = allCertTypes.FirstOrDefault(ct =>
                ct.Certification == certName &&
                ct.DivisionId == division &&
                ct.IsDeleted != true
            );

            if (certType != null)
            {
                viewModel.CertTypeId = certType.Id;
                viewModel.PizzaStatusId = certType.PizzaStatusId;

                // Find all statuses using this PizzaStatusID in this division
                var allStatusTypes = _statusTypeService.GetAllStatusTypes();
                viewModel.StatusesUsing = allStatusTypes
                    .Where(st =>
                        st.PizzaStatusId == certType.PizzaStatusId &&
                        st.DivisionId == division &&
                        st.IsDeleted != true)
                    .Select(st => st.Status)
                    .ToList();

                // Get all operators in this division
                var allOperators = _operatorService.GetAllOperators()
                    .Where(op => op.DivisionId == division)
                    .ToList();

                // Load certifications only for this division
                var allCertifications = _certificationService.GetCertificationsByDivision(division);

                // Filter operators by status that uses this PizzaStatusId
                foreach (var op in allOperators)
                {
                    var opStatusType = allStatusTypes.FirstOrDefault(st =>
                        st.Status == op.Status &&
                        st.DivisionId == op.DivisionId
                    );

                    if (opStatusType == null || opStatusType.PizzaStatusId != certType.PizzaStatusId)
                        continue;

                    // Load certifications for this operator
                    var operatorCerts = allCertifications.Where(c => c.OperatorId == op.Id).ToList();
                    
                    // Check if operator has this cert
                    var cert = operatorCerts.FirstOrDefault(c =>
                        c.CertTypeId == certType.Id &&
                        c.IsDeleted != true &&
                        c.IsApproved == true
                    );

                    if (cert != null)
                    {
                        // Has cert - check if expired
                        var isExpired = cert.Date.HasValue && cert.Date.Value < DateTime.Now;
                        viewModel.OperatorsWithCert.Add(new Models.ViewModels.OperatorWithCertStatus
                        {
                            Id = op.Id,
                            FirstName = op.FirstName,
                            LastName = op.LastName,
                            StatusName = op.Status,
                            DivisionId = op.DivisionId,
                            IsExpired = isExpired
                        });
                    }
                    else
                    {
                        // Missing cert
                        viewModel.OperatorsMissingCert.Add(new Models.ViewModels.OperatorBasicInfo
                        {
                            Id = op.Id,
                            FirstName = op.FirstName,
                            LastName = op.LastName,
                            StatusName = op.Status,
                            DivisionId = op.DivisionId
                        });
                    }
                }
            }

            return PartialView("_CertificationDetailsPanel", viewModel);
        }

        // GET: /Requirements/RenderOperatorProfile?operatorId=123
        public IActionResult RenderOperatorProfile(string operatorId)
        {
            var op = _operatorService.GetOperatorById(operatorId);
            if (op == null)
            {
                return NotFound();
            }

            // Load certifications only for this operator (avoid full-table scan)
            var opCertifications = _certificationService.GetCertificationsByOperatorIds(new List<string> { operatorId });
            op.Certifications = opCertifications ?? new List<Certification>();

            var opDivision = op.DivisionId ?? "";
            var opStatus = op.Status ?? "";

            // Find the operator's PizzaStatusId using the operator's division
            var allStatusTypes = _statusTypeService.GetStatusTypesByDivision(opDivision);
            var statusType = allStatusTypes.FirstOrDefault(st =>
                st.Status == opStatus &&
                st.DivisionId == opDivision
            );

            string pizzaStatusId = statusType?.PizzaStatusId ?? "";

            // Get all cert types for this PizzaStatusId
            var allCertTypes = _certTypeService.GetAllCertTypes();
            var pizzaStatusCertTypes = allCertTypes
                .Where(ct =>
                    ct.PizzaStatusId == pizzaStatusId &&
                    ct.DivisionId == opDivision &&
                    ct.IsDeleted != true
                )
                .ToList();

            // Build cert status map
            var certStatusMap = new Dictionary<string, CertStatus>();
            foreach (var certType in pizzaStatusCertTypes)
            {
                var certName = certType.Certification;
                var certTypeId = certType.Id;

                // Find approved cert for this operator by matching CertTypeID
                var cert = op.Certifications.FirstOrDefault(c =>
                    c.CertTypeId == certTypeId &&
                    c.IsDeleted != true &&
                    c.IsApproved == true
                );

                if (cert != null)
                {
                    certStatusMap[certName] = new CertStatus
                    {
                        Status = "has-cert",
                        Label = "Valid",
                        IssueDate = cert.RecordAt,
                        ExpireDate = cert.Date,
                        CertificateId = cert.CertificationId ?? "",
                        CertTypeId = certTypeId
                    };
                }
                else
                {
                    certStatusMap[certName] = new CertStatus
                    {
                        Status = "missing",
                        Label = "Missing",
                        CertificateId = "",
                        CertTypeId = certTypeId
                    };
                }
            }

            // Build subtitle (days in status calculated server-side from StatusTracker)
            var daysInStatus = _statusTrackerService.GetDaysInStatus(op.Id, op.StatusId ?? "");
            var subtitle = $"{op.Status ?? "Unknown Status"} • Division {op.DivisionId ?? "N/A"}";

            var viewModel = new OperatorProfileViewModel
            {
                Operator = op,
                CertStatusMap = certStatusMap,
                ValidCount = certStatusMap.Values.Count(c => c.Status == "has-cert"),
                MissingCount = certStatusMap.Values.Count(c => c.Status == "missing"),
                OperatorName = $"{op.FirstName} {op.LastName}",
                Subtitle = subtitle,
                IsOverdue = daysInStatus.HasValue && daysInStatus.Value >= 30,
                DaysInStatus = daysInStatus
            };

            return PartialView("_OperatorProfileModalContent", viewModel);
        }

        // GET: /Requirements/RenderStatusDeleteWarning?statusName=APPROVED&divisionId=5 - CA&currentOrderId=10
        public IActionResult RenderStatusDeleteWarning(string statusName, string divisionId, int currentOrderId)
        {
            // Get operators in this status
            var allOperators = _operatorService.GetAllOperators();
            var operatorsInStatus = allOperators
                .Where(op => op.Status == statusName && op.DivisionId == divisionId)
                .Select(op => new Models.ViewModels.OperatorBasicInfo
                {
                    Id = op.Id,
                    FirstName = op.FirstName,
                    LastName = op.LastName,
                    StatusName = op.Status,
                    DivisionId = op.DivisionId
                })
                .ToList();

            // Get all statuses in this division (excluding the one being deleted)
            var allStatusTypes = _statusTypeService.GetAllStatusTypes();
            var divisionStatuses = allStatusTypes
                .Where(st => st.DivisionId == divisionId && 
                            st.Status != statusName && 
                            st.IsDeleted != true)
                .OrderBy(st => int.TryParse(st.OrderId, out var order) ? order : 0)
                .ToList();

            // Find suggested status (previous in workflow)
            var previousStatus = divisionStatuses
                .Where(st => int.TryParse(st.OrderId, out var order) && order < currentOrderId)
                .OrderByDescending(st => int.TryParse(st.OrderId, out var order) ? order : 0)
                .FirstOrDefault();

            var suggestedStatus = previousStatus ?? divisionStatuses.FirstOrDefault();

            // Build status options
            var statusOptions = divisionStatuses.Select(st => new StatusOption
            {
                StatusName = st.Status,
                StatusId = st.Id,
                OrderId = st.OrderId,
                IsSelected = suggestedStatus != null && st.Status == suggestedStatus.Status
            }).ToList();

            var viewModel = new StatusDeleteWarningViewModel
            {
                StatusName = statusName,
                DivisionId = divisionId,
                OperatorCount = operatorsInStatus.Count,
                Operators = operatorsInStatus,
                StatusOptions = statusOptions,
                SuggestedStatusName = suggestedStatus?.Status,
                HasSuggestion = suggestedStatus != null
            };

            return PartialView("_StatusDeleteWarningModalContent", viewModel);
        }

        // GET: /Requirements/RenderCertDuplicateWarning?certName=CPR&oldStatus=APPROVED&newStatus=ACTIVE&divisionId=5 - CA
        public IActionResult RenderCertDuplicateWarning(string certName, string oldStatus, string newStatus, string divisionId)
        {
            var viewModel = new CertDuplicateWarningViewModel
            {
                CertName = certName,
                OldStatus = oldStatus,
                NewStatus = newStatus,
                DivisionId = divisionId
            };

            return PartialView("_CertDuplicateModalContent", viewModel);
        }

        // GET: /Requirements/GetAutoAdvanceCandidates?divisionId=5&clientId={clientId}
        // Uses the same filtering rules as the Requirements editor (operator-only workflow statuses)
        [HttpGet]
        public IActionResult GetAutoAdvanceCandidates(string divisionId, string clientId = null)
        {
            if (string.IsNullOrEmpty(divisionId) || divisionId == "ALL")
            {
                return Json(new List<AutoAdvanceCandidate>());
            }

            var operators = _operatorService.GetOperatorsByDivision(divisionId);
            if (operators == null || operators.Count == 0)
            {
                return Json(new List<AutoAdvanceCandidate>());
            }

            var allCertifications = _certificationService.GetCertificationsByDivision(divisionId);
            var allStatusTypes = _statusTypeService.GetStatusTypesByDivision(divisionId);
            var allCertTypes = _certTypeService.GetAllCertTypes();
            var allPizzaStatuses = _pizzaStatusService.GetAllPizzaStatuses();

            // Build a safe lookup for PizzaStatus by Id (defensive against duplicate IDs)
            var pizzaStatusLookup = allPizzaStatuses
                .Where(ps => !string.IsNullOrEmpty(ps.Id))
                .GroupBy(ps => ps.Id)
                .ToDictionary(g => g.Key, g => g.First());

            // Apply the same operator-only workflow filters used by the Requirements editor JS:
            // - Same division
            // - Not deleted
            // - Has PizzaStatusId that exists
            // - StatusType.Fleet != true and Providers != true
            // - PizzaStatus.IsOperator == true
            // - If clientId is specified, PizzaStatus.ClientId must match
            var divisionStatuses = allStatusTypes
                .Where(st => st.DivisionId == divisionId && st.IsDeleted != true)
                .Where(st =>
                {
                    if (string.IsNullOrEmpty(st.PizzaStatusId)) return false;

                    if (!pizzaStatusLookup.TryGetValue(st.PizzaStatusId, out var ps)) return false;

                    if (st.Fleet == true || st.Providers == true) return false;

                    if (ps.IsOperator != true) return false;

                    if (!string.IsNullOrEmpty(clientId))
                    {
                        if (!string.Equals(ps.ClientId, clientId, StringComparison.OrdinalIgnoreCase))
                        {
                            return false;
                        }
                    }

                    return true;
                })
                .ToList();

            var candidates = new List<AutoAdvanceCandidate>();

            foreach (var op in operators)
            {
                var opStatus = op.Status ?? string.Empty;
                if (string.IsNullOrWhiteSpace(opStatus))
                {
                    continue;
                }

                // Find status type for operator's current status in this division
                var statusType = divisionStatuses.FirstOrDefault(st => st.Status == opStatus)
                                 ?? divisionStatuses.FirstOrDefault(st => string.Equals(st.Status, opStatus, StringComparison.OrdinalIgnoreCase));

                if (statusType == null || string.IsNullOrEmpty(statusType.PizzaStatusId))
                {
                    continue;
                }

                if (!pizzaStatusLookup.TryGetValue(statusType.PizzaStatusId, out var pizzaStatus))
                {
                    continue;
                }
                if (pizzaStatus.IsAuto != true)
                {
                    // Only consider auto-advance pizza statuses
                    continue;
                }

                // Get all cert types for this PizzaStatusId and division
                var pizzaStatusCertTypes = allCertTypes
                    .Where(ct =>
                        ct.PizzaStatusId == statusType.PizzaStatusId &&
                        ct.DivisionId == divisionId &&
                        ct.IsDeleted != true)
                    .ToList();

                if (pizzaStatusCertTypes.Count == 0)
                {
                    continue;
                }

                var opCerts = allCertifications
                    .Where(c => c.OperatorId == op.Id)
                    .ToList();

                int currentValid = 0;
                int currentMissing = 0;

                foreach (var certType in pizzaStatusCertTypes)
                {
                    var certTypeId = certType.Id;

                    var cert = opCerts.FirstOrDefault(c =>
                    {
                        if (c.CertTypeId != certTypeId) return false;
                        if (c.IsDeleted == true) return false;
                        if (c.IsApproved != true) return false;
                        return true;
                    });

                    if (cert != null)
                    {
                        currentValid++;
                    }
                    else
                    {
                        currentMissing++;
                    }
                }

                // Only consider operators who have ALL required certs for this auto-advance status
                if (currentMissing != 0)
                {
                    continue;
                }

                // Determine numeric OrderId for current status
                if (!int.TryParse(statusType.OrderId, out var currentOrder))
                {
                    continue;
                }

                var nextStatus = divisionStatuses
                    // Only consider statuses that are further in the workflow
                    .Where(st => int.TryParse(st.OrderId, out var order) && order > currentOrder)
                    // And that do NOT share the same PizzaStatusId as the current status
                    .Where(st => !string.Equals(st.PizzaStatusId, statusType.PizzaStatusId, StringComparison.OrdinalIgnoreCase))
                    .OrderBy(st => int.TryParse(st.OrderId, out var order) ? order : int.MaxValue)
                    .FirstOrDefault();

                if (nextStatus == null)
                {
                    continue;
                }

                candidates.Add(new AutoAdvanceCandidate
                {
                    OperatorId = op.Id,
                    OperatorName = $"{op.FirstName} {op.LastName}",
                    DivisionId = divisionId,
                    CurrentStatusId = statusType.Id,
                    CurrentStatusName = statusType.Status,
                    CurrentOrderId = statusType.OrderId,
                    NextStatusId = nextStatus.Id,
                    NextStatusName = nextStatus.Status,
                    NextOrderId = nextStatus.OrderId,
                    PizzaStatusId = statusType.PizzaStatusId,
                    IsAuto = true
                });
            }

            return Json(candidates);
        }

        // GET: /Requirements/GetComplianceSummary?divisionId=5&clientId={clientId}
        // Returns aggregate cert coverage across all visible operator/status combinations:
        // totalRequiredSlots = total required cert "slots"; fulfilledSlots = how many of those slots have an approved cert.
        [HttpGet]
        public IActionResult GetComplianceSummary(string divisionId, string clientId = null)
        {
            if (string.IsNullOrEmpty(divisionId) || divisionId == "ALL")
            {
                return Json(new { totalRequiredSlots = 0, fulfilledSlots = 0, percent = 0 });
            }

            var operators = _operatorService.GetOperatorsByDivision(divisionId);
            if (operators == null || operators.Count == 0)
            {
                return Json(new { totalRequiredSlots = 0, fulfilledSlots = 0, percent = 0 });
            }

            var allCertifications = _certificationService.GetCertificationsByDivision(divisionId);
            var allStatusTypes = _statusTypeService.GetStatusTypesByDivision(divisionId);
            var allCertTypes = _certTypeService.GetAllCertTypes();
            var allPizzaStatuses = _pizzaStatusService.GetAllPizzaStatuses();

            // Build a safe lookup for PizzaStatus by Id (defensive against duplicate IDs)
            var pizzaStatusLookup = allPizzaStatuses
                .Where(ps => !string.IsNullOrEmpty(ps.Id))
                .GroupBy(ps => ps.Id)
                .ToDictionary(g => g.Key, g => g.First());

            // Mirror Requirements editor filtering for operator workflow statuses
            var divisionStatuses = allStatusTypes
                .Where(st => st.DivisionId == divisionId && st.IsDeleted != true)
                .Where(st =>
                {
                    if (string.IsNullOrEmpty(st.PizzaStatusId)) return false;

                    if (!pizzaStatusLookup.TryGetValue(st.PizzaStatusId, out var ps)) return false;

                    if (st.Fleet == true || st.Providers == true) return false;

                    if (ps.IsOperator != true) return false;

                    if (!string.IsNullOrEmpty(clientId))
                    {
                        if (!string.Equals(ps.ClientId, clientId, StringComparison.OrdinalIgnoreCase))
                        {
                            return false;
                        }
                    }

                    return true;
                })
                .ToList();

            // Map (division,statusName) -> StatusType
            var statusMap = divisionStatuses
                .GroupBy(st => new { st.DivisionId, st.Status })
                .ToDictionary(g => g.Key, g => g.First());

            // Group certifications by operator for quick lookups, only approved and not deleted
            var certsByOperator = allCertifications
                .Where(c => c.IsDeleted != true && c.IsApproved == true &&
                            !string.IsNullOrEmpty(c.OperatorId) && !string.IsNullOrEmpty(c.CertTypeId))
                .GroupBy(c => c.OperatorId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.CertTypeId).ToHashSet());

            int totalRequiredSlots = 0;
            int fulfilledSlots = 0;

            foreach (var op in operators)
            {
                var opDivision = op.DivisionId ?? string.Empty;
                var opStatus = op.Status ?? string.Empty;
                var opId = op.Id;

                // Skip operators without required fields (defensive against bad data)
                if (string.IsNullOrWhiteSpace(opDivision) || string.IsNullOrWhiteSpace(opStatus) || string.IsNullOrEmpty(opId))
                {
                    continue;
                }

                var key = new { DivisionId = opDivision, Status = opStatus };
                if (!statusMap.TryGetValue(key, out var statusType))
                {
                    // Try case-insensitive fallback
                    statusType = statusMap
                        .Where(kvp => string.Equals(kvp.Key.DivisionId, opDivision, StringComparison.OrdinalIgnoreCase) &&
                                      string.Equals(kvp.Key.Status, opStatus, StringComparison.OrdinalIgnoreCase))
                        .Select(kvp => kvp.Value)
                        .FirstOrDefault();
                }

                if (statusType == null || string.IsNullOrEmpty(statusType.PizzaStatusId))
                {
                    continue;
                }

                if (!pizzaStatusLookup.TryGetValue(statusType.PizzaStatusId, out var psForStatus))
                {
                    continue;
                }

                // Get required cert types for this PizzaStatusId + division
                var requiredCertTypes = allCertTypes
                    .Where(ct => ct.PizzaStatusId == statusType.PizzaStatusId &&
                                 ct.DivisionId == opDivision &&
                                 ct.IsDeleted != true)
                    .ToList();

                if (requiredCertTypes.Count == 0)
                {
                    continue;
                }

                var heldCertTypeIds = certsByOperator.TryGetValue(opId, out var set)
                    ? set
                    : new HashSet<string>();

                foreach (var ct in requiredCertTypes)
                {
                    totalRequiredSlots++;
                    if (!string.IsNullOrEmpty(ct.Id) && heldCertTypeIds.Contains(ct.Id))
                    {
                        fulfilledSlots++;
                    }
                }
            }

            int percent = totalRequiredSlots > 0
                ? (int)Math.Round((double)fulfilledSlots / totalRequiredSlots * 100.0)
                : 0;

            return Json(new { totalRequiredSlots, fulfilledSlots, percent });
        }

        // GET: /Requirements/GetClients - Returns distinct clients from PizzaStatus
        [HttpGet]
        public IActionResult GetClients()
        {
            try
            {
                var allPizzaStatuses = _pizzaStatusService.GetAllPizzaStatuses();
                
                // Group by ClientId and get first PizzaStatus for each client to extract Status as client name
                var clients = allPizzaStatuses
                    .Where(ps => !string.IsNullOrEmpty(ps.ClientId))
                    .GroupBy(ps => ps.ClientId)
                    .Select(g => new 
                    { 
                        ClientId = g.Key,
                        // Try to find a recognizable client name from Status field or use first status
                        ClientName = g.FirstOrDefault()?.Status ?? "Unknown Client"
                    })
                    .OrderBy(c => c.ClientName)
                    .ToList();

                return Json(clients);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetClients failed: {ex.Message}");
                return Json(new List<object>());
            }
        }
    }

    public class RequirementsEditorViewModel
    {
        public List<Operator>? Operators { get; set; }
        public List<Certification>? Certifications { get; set; }
        public List<PizzaStatus>? PizzaStatuses { get; set; }
        public List<StatusType>? StatusTypes { get; set; }
        public List<Requirement>? Requirements { get; set; }
    }

    public class OperatorProfileViewModel
    {
        public Operator Operator { get; set; }
        public Dictionary<string, CertStatus> CertStatusMap { get; set; }
        public int ValidCount { get; set; }
        public int MissingCount { get; set; }
        public string OperatorName { get; set; }
        public string Subtitle { get; set; }
        public bool IsOverdue { get; set; }
        public int? DaysInStatus { get; set; }
    }

    public class CertStatus
    {
        public string Status { get; set; } // "has-cert" or "missing"
        public string Label { get; set; } // "Valid" or "Missing"
        public DateTime? IssueDate { get; set; }
        public DateTime? ExpireDate { get; set; }
        public string CertificateId { get; set; }
        public string CertTypeId { get; set; }
    }

    public class StatusDeleteWarningViewModel
    {
        public string StatusName { get; set; }
        public string DivisionId { get; set; }
        public int OperatorCount { get; set; }
        public List<Models.ViewModels.OperatorBasicInfo> Operators { get; set; } = new List<Models.ViewModels.OperatorBasicInfo>();
        public List<StatusOption> StatusOptions { get; set; } = new List<StatusOption>();
        public string? SuggestedStatusName { get; set; }
        public bool HasSuggestion { get; set; }
    }

    public class StatusOption
    {
        public string StatusName { get; set; }
        public string StatusId { get; set; }
        public string OrderId { get; set; }
        public bool IsSelected { get; set; }
    }

    public class CertDuplicateWarningViewModel
    {
        public string CertName { get; set; }
        public string OldStatus { get; set; }
        public string NewStatus { get; set; }
        public string DivisionId { get; set; }
    }

    public class AutoAdvanceCandidate
    {
        public string OperatorId { get; set; }
        public string OperatorName { get; set; }
        public string DivisionId { get; set; }
        public string CurrentStatusId { get; set; }
        public string CurrentStatusName { get; set; }
        public string CurrentOrderId { get; set; }
        public string NextStatusId { get; set; }
        public string NextStatusName { get; set; }
        public string NextOrderId { get; set; }
        public string PizzaStatusId { get; set; }
        public bool IsAuto { get; set; }
    }
}
