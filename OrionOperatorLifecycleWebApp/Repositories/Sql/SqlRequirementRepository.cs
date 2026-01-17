using System.Collections.Generic;
using System.Linq;
using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;

namespace OrionOperatorLifecycleWebApp.Repositories.Sql
{
    public class SqlRequirementRepository : IRequirementRepository
    {
        private readonly OrionDbContext _context;

        public SqlRequirementRepository(OrionDbContext context)
        {
            _context = context;
        }

        public List<Requirement> GetAll()
        {
            return new List<Requirement>();
        }

        public Requirement GetByPizzaStatusAndDivision(string pizzaStatusId, string division) 
        {
            return null;
        }

        public void SaveAll(List<Requirement> requirements)
        {
            // No-op as table is removed
        }
    }
}
