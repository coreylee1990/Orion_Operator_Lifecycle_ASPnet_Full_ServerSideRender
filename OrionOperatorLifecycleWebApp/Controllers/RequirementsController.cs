
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

        public RequirementsController(
            IOperatorService operatorService,
            ICertificationService certificationService,
            IPizzaStatusService pizzaStatusService,
            IStatusTypeService statusTypeService,
            IRequirementService requirementService,
            ICertTypeService certTypeService)
        {
            _operatorService = operatorService;
            _certificationService = certificationService;
            _pizzaStatusService = pizzaStatusService;
            _statusTypeService = statusTypeService;
            _requirementService = requirementService;
            _certTypeService = certTypeService;
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
            List<Certification> certifications;

            if (string.IsNullOrEmpty(divisionId) || divisionId == "ALL")
            {
                // Load ALL operators and certs (fallback for "All Divisions")
                operators = _operatorService.GetAllOperators();
                certifications = _certificationService.GetAllCertifications();
            }
            else
            {
                // Load only operators and certs for this division
                operators = _operatorService.GetAllOperators()
                    .Where(op => op.DivisionId == divisionId)
                    .ToList();
                
                var operatorIds = operators.Select(op => op.Id).ToHashSet();
                certifications = _certificationService.GetAllCertifications()
                    .Where(c => operatorIds.Contains(c.OperatorId))
                    .ToList();
            }

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

            // CRITICAL: Load certifications for this operator (they're stored separately)
            var allCertifications = _certificationService.GetAllCertifications();
            op.Certifications = allCertifications
                .Where(c => c.OperatorId == operatorId)
                .ToList();

            // Use the divisionId parameter from the workflow context (not operator's stored division)
            // This ensures we look up certs for the correct division context
            var workflowDivision = divisionId ?? "";
            var opStatus = op.StatusName ?? "";

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
                    // Must not be deleted
                    if (c.IsDeleted == "1" || c.IsDeleted == "1" || c.IsDeleted == "true") return false;
                    // Must be approved (isApproved === '1')
                    if (c.IsApproved != "1" && c.IsApproved != "1" && c.IsApproved != "true") return false;
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

            // Stats for current PizzaStatus only (lines 2973-2974)
            ViewBag.ValidCount = currentValid;
            ViewBag.MissingCount = currentMissing;
            ViewBag.DaysInStatus = null;

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

                // Load all certifications
                var allCertifications = _certificationService.GetAllCertifications();

                // Filter operators by status that uses this PizzaStatusId
                foreach (var op in allOperators)
                {
                    var opStatusType = allStatusTypes.FirstOrDefault(st =>
                        st.Status == op.StatusName &&
                        st.DivisionId == op.DivisionId
                    );

                    if (opStatusType == null || opStatusType.PizzaStatusId != certType.PizzaStatusId)
                        continue;

                    // Load certifications for this operator
                    var operatorCerts = allCertifications.Where(c => c.OperatorId == op.Id).ToList();
                    
                    // Check if operator has this cert
                    var cert = operatorCerts.FirstOrDefault(c =>
                        c.CertTypeId == certType.Id &&
                        c.IsDeleted != "1" &&
                        c.IsApproved == "1"
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
                            StatusName = op.StatusName,
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
                            StatusName = op.StatusName,
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

            // Load certifications for this operator
            var allCertifications = _certificationService.GetAllCertifications();
            op.Certifications = allCertifications
                .Where(c => c.OperatorId == operatorId)
                .ToList();

            var opDivision = op.DivisionId ?? "";
            var opStatus = op.StatusName ?? "";

            // Find the operator's PizzaStatusId
            var allStatusTypes = _statusTypeService.GetAllStatusTypes();
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
                    c.IsDeleted != "1" &&
                    c.IsApproved == "1"
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

            var viewModel = new OperatorProfileViewModel
            {
                Operator = op,
                CertStatusMap = certStatusMap,
                ValidCount = certStatusMap.Values.Count(c => c.Status == "has-cert"),
                MissingCount = certStatusMap.Values.Count(c => c.Status == "missing")
            };

            return PartialView("_OperatorProfileModalContent", viewModel);
        }

        // GET: /Requirements/RenderStatusDeleteWarning?statusName=APPROVED&divisionId=5 - CA&currentOrderId=10
        public IActionResult RenderStatusDeleteWarning(string statusName, string divisionId, int currentOrderId)
        {
            // Get operators in this status
            var allOperators = _operatorService.GetAllOperators();
            var operatorsInStatus = allOperators
                .Where(op => op.StatusName == statusName && op.DivisionId == divisionId)
                .Select(op => new Models.ViewModels.OperatorBasicInfo
                {
                    Id = op.Id,
                    FirstName = op.FirstName,
                    LastName = op.LastName,
                    StatusName = op.StatusName,
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
}
