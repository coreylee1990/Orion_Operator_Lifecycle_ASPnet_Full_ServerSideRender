using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;

namespace OrionOperatorLifecycleWebApp.Repositories.Sql
{
    public class SqlPizzaStatusRepository : IPizzaStatusRepository
    {
        private readonly OrionDbContext _context;

        public SqlPizzaStatusRepository(OrionDbContext context)
        {
            _context = context;
        }

        public List<PizzaStatus> GetAll() => _context.PizzaStatuses.AsNoTracking().ToList();

        public PizzaStatus? GetById(string id) => _context.PizzaStatuses.Find(id);

        public PizzaStatus? GetByStatus(string status) => 
            _context.PizzaStatuses.AsNoTracking().FirstOrDefault(p => p.Status == status);

        public void SaveAll(List<PizzaStatus> pizzaStatuses)
        {
            if (pizzaStatuses == null || pizzaStatuses.Count == 0)
            {
                return;
            }

            // Pure writes only - no SELECT queries.
            foreach (var pizzaStatus in pizzaStatuses)
            {
                if (string.IsNullOrWhiteSpace(pizzaStatus.Id))
                {
                    _context.PizzaStatuses.Add(pizzaStatus);
                }
                else
                {
                    _context.PizzaStatuses.Attach(pizzaStatus);
                    _context.Entry(pizzaStatus).State = EntityState.Modified;
                }
            }

            _context.SaveChanges();

            // Detach all to avoid tracking issues
            foreach (var pizzaStatus in pizzaStatuses)
            {
                _context.Entry(pizzaStatus).State = EntityState.Detached;
            }
        }
    }
}
