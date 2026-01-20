using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;

namespace OrionOperatorLifecycleWebApp.Repositories.Sql
{
    public class SqlCertTypeRepository : ICertTypeRepository
    {
        private readonly OrionDbContext _context;

        public SqlCertTypeRepository(OrionDbContext context)
        {
            _context = context;
        }

        public List<CertType> GetAll()
        {
            return _context.CertTypes.AsNoTracking().ToList();
        }

        public List<CertType> GetByClient(string clientId)
        {
            if (string.IsNullOrWhiteSpace(clientId))
            {
                return GetAll();
            }

            // Filter cert types to those whose PizzaStatus belongs to the specified client.
            var query =
                from ct in _context.CertTypes.AsNoTracking()
                join ps in _context.PizzaStatuses.AsNoTracking()
                    on ct.PizzaStatusId equals ps.Id
                where ps.ClientId == clientId
                select ct;

            return query.ToList();
        }

        public List<CertType> GetByPizzaStatusIds(IEnumerable<string> pizzaStatusIds)
        {
            if (pizzaStatusIds == null)
            {
                return new List<CertType>();
            }

            var ids = pizzaStatusIds
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .ToList();

            if (!ids.Any())
            {
                return new List<CertType>();
            }

            return _context.CertTypes
                .AsNoTracking()
                .Where(ct => ct.PizzaStatusId != null && ids.Contains(ct.PizzaStatusId))
                .ToList();
        }

        public void SaveAll(List<CertType> certTypes)
        {
            if (certTypes == null || certTypes.Count == 0)
            {
                return;
            }

            // Pure writes only - no SELECT queries.
            // Attach each entity and mark as Modified; EF will generate UPDATE statements.
            // For truly new records (no ID), Add them.
            foreach (var cert in certTypes)
            {
                if (string.IsNullOrWhiteSpace(cert.Id))
                {
                    _context.CertTypes.Add(cert);
                }
                else
                {
                    _context.CertTypes.Attach(cert);
                    _context.Entry(cert).State = EntityState.Modified;
                }
            }

            _context.SaveChanges();

            // Detach all to avoid tracking issues on subsequent operations
            foreach (var cert in certTypes)
            {
                _context.Entry(cert).State = EntityState.Detached;
            }
        }
    }
}
