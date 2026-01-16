
using Microsoft.AspNetCore.Mvc;
using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Services;
using System.Collections.Generic;

namespace OrionOperatorLifecycleWebApp.Controllers
{
    public class RequirementsController : Controller
    {
        private readonly IOperatorService _operatorService;
        private readonly ICertificationService _certificationService;
        private readonly IPizzaStatusService _pizzaStatusService;
        private readonly IStatusTypeService _statusTypeService;
        private readonly IRequirementService _requirementService;

        public RequirementsController(
            IOperatorService operatorService,
            ICertificationService certificationService,
            IPizzaStatusService pizzaStatusService,
            IStatusTypeService statusTypeService,
            IRequirementService requirementService)
        {
            _operatorService = operatorService;
            _certificationService = certificationService;
            _pizzaStatusService = pizzaStatusService;
            _statusTypeService = statusTypeService;
            _requirementService = requirementService;
        }

        // GET: /Requirements/
        public IActionResult Index()
        {
            var model = new RequirementsEditorViewModel
            {
                Operators = _operatorService.GetAllOperators(),
                Certifications = _certificationService.GetAllCertifications(),
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
    }

    public class RequirementsEditorViewModel
    {
        public List<Operator>? Operators { get; set; }
        public List<Certification>? Certifications { get; set; }
        public List<PizzaStatus>? PizzaStatuses { get; set; }
        public List<StatusType>? StatusTypes { get; set; }
        public List<Requirement>? Requirements { get; set; }
    }
}
