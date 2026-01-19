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

        public StatusManagementController(
            IStatusTypeService statusTypeService,
            IPizzaStatusService pizzaStatusService)
        {
            _statusTypeService = statusTypeService;
            _pizzaStatusService = pizzaStatusService;
        }

        // GET: /StatusManagement/
        public IActionResult Index(string division = null, bool? fleet = null, bool? providers = null, bool? isDeleted = null)
        {
            var allStatuses = _statusTypeService.GetAllStatusTypes();
            var pizzaStatuses = _pizzaStatusService.GetAllPizzaStatuses();

            // Apply filters
            if (!string.IsNullOrEmpty(division) && division != "ALL")
            {
                allStatuses = allStatuses.Where(s => s.DivisionId == division).ToList();
            }

            if (fleet.HasValue)
            {
                allStatuses = allStatuses.Where(s => s.Fleet == fleet.Value).ToList();
            }

            if (providers.HasValue)
            {
                allStatuses = allStatuses.Where(s => s.Providers == providers.Value).ToList();
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
            ViewBag.SelectedDivision = division;
            ViewBag.SelectedFleet = fleet;
            ViewBag.SelectedProviders = providers;
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
