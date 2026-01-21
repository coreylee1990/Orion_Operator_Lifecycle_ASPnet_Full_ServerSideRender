using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
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

        public List<StatusType> GetAll() => _context.StatusTypes.AsNoTracking().ToList();

        public StatusType GetById(string id) => _context.StatusTypes.Find(id);

        public List<StatusType> GetByDivision(string divisionId) => 
            _context.StatusTypes.AsNoTracking().Where(s => s.DivisionId == divisionId).ToList();

        public void SaveAll(List<StatusType> statusTypes)
        {
            if (statusTypes == null || statusTypes.Count == 0)
            {
                return;
            }

            // Pure writes only - no SELECT queries.
            foreach (var status in statusTypes)
            {
                if (string.IsNullOrWhiteSpace(status.Id))
                {
                    _context.StatusTypes.Add(status);
                }
                else
                {
                    _context.StatusTypes.Attach(status);
                    _context.Entry(status).State = EntityState.Modified;
                }
            }

            _context.SaveChanges();

            // Detach all to avoid tracking issues
            foreach (var status in statusTypes)
            {
                _context.Entry(status).State = EntityState.Detached;
            }
        }

        public void Add(StatusType statusType)
        {
            if (statusType == null) return;

            // Generate ID if not provided
            if (string.IsNullOrWhiteSpace(statusType.Id))
            {
                statusType.Id = System.Guid.NewGuid().ToString().ToUpper();
            }

            _context.StatusTypes.Add(statusType);
            _context.SaveChanges();
            _context.Entry(statusType).State = EntityState.Detached;
        }
    }
}
