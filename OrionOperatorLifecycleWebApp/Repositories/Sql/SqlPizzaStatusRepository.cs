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
    }
}
