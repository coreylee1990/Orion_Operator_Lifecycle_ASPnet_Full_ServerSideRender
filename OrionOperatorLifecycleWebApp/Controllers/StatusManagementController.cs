using Microsoft.AspNetCore.Mvc;
using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Services;
using System.Collections.Generic;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Controllers
{
    public class StatusManagementController : Controller
    {
        private readonly IStatusTypeService _statusTypeService;
        private readonly IPizzaStatusService _pizzaStatusService;
        private readonly IOperatorService _operatorService;
        private readonly IClientService _clientService;

        public StatusManagementController(
            IStatusTypeService statusTypeService,
            IPizzaStatusService pizzaStatusService,
            IOperatorService operatorService,
            IClientService clientService)
        {
            _statusTypeService = statusTypeService;
            _pizzaStatusService = pizzaStatusService;
            _operatorService = operatorService;
            _clientService = clientService;
        }

        // GET: /StatusManagement/
        public IActionResult Index(string division = null, string divisionFilter = null, bool? operators = null, bool? fleet = null, bool? providers = null, bool? hasProvider = null, bool? isDeleted = null)
        {
            var allStatuses = _statusTypeService.GetAllStatusTypes();
            var pizzaStatuses = _pizzaStatusService.GetAllPizzaStatuses();
            var allOperators = _operatorService.GetAllOperators();
            var clients = _clientService.GetAllClients();

            // Calculate operator counts per division (only where Fleet=false and Providers=false)
            var operatorCounts = allOperators
                .Where(o => o.IsDeleted != true)
                .GroupBy(o => o.DivisionId)
                .ToDictionary(
                    g => g.Key ?? "",
                    g => g.Count()
                );

            // Apply filters
            if (!string.IsNullOrEmpty(division) && division != "ALL")
            {
                // Client filter (if wired to a client identifier)
                allStatuses = allStatuses.Where(s => s.DivisionId == division).ToList();
            }

            if (!string.IsNullOrEmpty(divisionFilter))
            {
                // Explicit DivisionID filter
                allStatuses = allStatuses.Where(s => s.DivisionId == divisionFilter).ToList();
            }

            if (operators.HasValue && operators.Value)
            {
                // Operators only: Fleet != true AND Providers != true
                allStatuses = allStatuses.Where(s => s.Fleet != true && s.Providers != true).ToList();
            }

            if (fleet.HasValue && fleet.Value)
            {
                allStatuses = allStatuses.Where(s => s.Fleet == true).ToList();
            }

            if (providers.HasValue && providers.Value)
            {
                allStatuses = allStatuses.Where(s => s.Providers == true).ToList();
            }

            if (hasProvider.HasValue)
            {
                if (hasProvider.Value)
                {
                    // Has Provider: DivisionId is not null or empty
                    allStatuses = allStatuses.Where(s => !string.IsNullOrEmpty(s.DivisionId)).ToList();
                }
                else
                {
                    // No Provider: DivisionId is null or empty
                    allStatuses = allStatuses.Where(s => string.IsNullOrEmpty(s.DivisionId)).ToList();
                }
            }

            if (isDeleted.HasValue)
            {
                allStatuses = allStatuses.Where(s => s.IsDeleted == isDeleted.Value).ToList();
            }
            else
            {
                // By default, exclude deleted items
                allStatuses = allStatuses.Where(s => s.IsDeleted != true).ToList();
            }

            // Sort by DivisionID and OrderID
            allStatuses = allStatuses
                .OrderBy(s => s.DivisionId)
                .ThenBy(s => int.TryParse(s.OrderId, out int order) ? order : 999)
                .ToList();

            ViewBag.PizzaStatuses = pizzaStatuses;
            ViewBag.Clients = clients;
            ViewBag.Operators = allOperators;
            ViewBag.OperatorCounts = operatorCounts;
            ViewBag.SelectedDivision = division;
            ViewBag.SelectedDivisionFilter = divisionFilter;
            ViewBag.SelectedOperators = operators;
            ViewBag.SelectedFleet = fleet;
            ViewBag.SelectedProviders = providers;
            ViewBag.SelectedHasProvider = hasProvider;
            ViewBag.SelectedIsDeleted = isDeleted;

            return View(allStatuses);
        }

        // GET: /StatusManagement/Create
        public IActionResult Create()
        {
            var pizzaStatuses = _pizzaStatusService.GetAllPizzaStatuses();
            ViewBag.PizzaStatuses = pizzaStatuses;
            return View();
        }

        // POST: /StatusManagement/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Create(StatusType statusType)
        {
            if (ModelState.IsValid)
            {
                var allStatuses = _statusTypeService.GetAllStatusTypes();
                
                // Generate new ID
                var maxId = allStatuses
                    .Select(s => int.TryParse(s.Id, out int id) ? id : 0)
                    .DefaultIfEmpty(0)
                    .Max();
                statusType.Id = (maxId + 1).ToString();

                allStatuses.Add(statusType);
                _statusTypeService.SaveAllStatusTypes(allStatuses);

                return RedirectToAction(nameof(Index));
            }

            var pizzaStatuses = _pizzaStatusService.GetAllPizzaStatuses();
            ViewBag.PizzaStatuses = pizzaStatuses;
            return View(statusType);
        }

        // GET: /StatusManagement/Edit/5
        public IActionResult Edit(string id)
        {
            var statusType = _statusTypeService.GetStatusTypeById(id);
            if (statusType == null)
            {
                return NotFound();
            }

            var pizzaStatuses = _pizzaStatusService.GetAllPizzaStatuses();
            ViewBag.PizzaStatuses = pizzaStatuses;
            return View(statusType);
        }

        // POST: /StatusManagement/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Edit(string id, StatusType statusType)
        {
            if (id != statusType.Id)
            {
                return BadRequest();
            }

            if (ModelState.IsValid)
            {
                var allStatuses = _statusTypeService.GetAllStatusTypes();
                var existing = allStatuses.FirstOrDefault(s => s.Id == id);
                
                if (existing != null)
                {
                    existing.Status = statusType.Status;
                    existing.DivisionId = statusType.DivisionId;
                    existing.OrderId = statusType.OrderId;
                    existing.PizzaStatusId = statusType.PizzaStatusId;
                    existing.Fleet = statusType.Fleet;
                    existing.Providers = statusType.Providers;
                    existing.IsDeleted = statusType.IsDeleted;

                    _statusTypeService.SaveAllStatusTypes(allStatuses);
                }

                return RedirectToAction(nameof(Index));
            }

            var pizzaStatuses = _pizzaStatusService.GetAllPizzaStatuses();
            ViewBag.PizzaStatuses = pizzaStatuses;
            return View(statusType);
        }

        // GET: /StatusManagement/Delete/5
        public IActionResult Delete(string id)
        {
            var statusType = _statusTypeService.GetStatusTypeById(id);
            if (statusType == null)
            {
                return NotFound();
            }

            var pizzaStatuses = _pizzaStatusService.GetAllPizzaStatuses();
            var relatedPizzaStatus = pizzaStatuses.FirstOrDefault(ps => ps.Id == statusType.PizzaStatusId);
            ViewBag.RelatedPizzaStatus = relatedPizzaStatus;

            return View(statusType);
        }

        // POST: /StatusManagement/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public IActionResult DeleteConfirmed(string id)
        {
            var allStatuses = _statusTypeService.GetAllStatusTypes();
            var statusType = allStatuses.FirstOrDefault(s => s.Id == id);

            if (statusType != null)
            {
                // Soft delete
                statusType.IsDeleted = true;
                _statusTypeService.SaveAllStatusTypes(allStatuses);
            }

            return RedirectToAction(nameof(Index));
        }

        // POST: /StatusManagement/Restore/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Restore(string id)
        {
            var allStatuses = _statusTypeService.GetAllStatusTypes();
            var statusType = allStatuses.FirstOrDefault(s => s.Id == id);

            if (statusType != null)
            {
                statusType.IsDeleted = false;
                _statusTypeService.SaveAllStatusTypes(allStatuses);
            }

            return RedirectToAction(nameof(Index), new { isDeleted = true });
        }

        // POST: /StatusManagement/HardDelete/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult HardDelete(string id)
        {
            var allStatuses = _statusTypeService.GetAllStatusTypes();
            var statusType = allStatuses.FirstOrDefault(s => s.Id == id);

            if (statusType != null)
            {
                allStatuses.Remove(statusType);
                _statusTypeService.SaveAllStatusTypes(allStatuses);
            }

            return RedirectToAction(nameof(Index));
        }
    }
}
