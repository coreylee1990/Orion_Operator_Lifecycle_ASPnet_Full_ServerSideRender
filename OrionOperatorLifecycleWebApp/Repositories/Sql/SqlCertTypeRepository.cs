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

        public void SaveAll(List<CertType> certTypes)
        {
            foreach (var cert in certTypes)
            {
                var existing = _context.CertTypes.Find(cert.Id);
                if (existing != null)
                {
                    _context.Entry(existing).CurrentValues.SetValues(cert);
                }
                else
                {
                    _context.CertTypes.Add(cert);
                }
            }
            _context.SaveChanges();
        }
    }
}
