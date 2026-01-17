using System.Collections.Generic;
using System.Linq;
using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;

namespace OrionOperatorLifecycleWebApp.Repositories.Sql
{
    public class SqlStatusTypeRepository : IStatusTypeRepository
    {
        private readonly OrionDbContext _context;

        public SqlStatusTypeRepository(OrionDbContext context)
        {
            _context = context;
        }

        public List<StatusType> GetAll() => _context.StatusTypes.ToList();

        public StatusType GetById(string id) => _context.StatusTypes.Find(id);

        public List<StatusType> GetByDivision(string divisionId) => 
            _context.StatusTypes.Where(s => s.DivisionId == divisionId).ToList();

        public void SaveAll(List<StatusType> statusTypes)
        {
            // Sync logic: Upsert incoming items.
            foreach (var status in statusTypes)
            {
                var existing = _context.StatusTypes.Find(status.Id);
                if (existing != null)
                {
                    _context.Entry(existing).CurrentValues.SetValues(status);
                }
                else
                {
                    _context.StatusTypes.Add(status);
                }
            }
            _context.SaveChanges();
        }
    }
}
