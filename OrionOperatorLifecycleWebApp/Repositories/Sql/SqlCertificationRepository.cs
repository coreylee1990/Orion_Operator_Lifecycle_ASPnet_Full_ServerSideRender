using System.Collections.Generic;
using System.Linq;
using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;

namespace OrionOperatorLifecycleWebApp.Repositories.Sql
{
    public class SqlCertificationRepository : ICertificationRepository
    {
        private readonly OrionDbContext _context;

        public SqlCertificationRepository(OrionDbContext context)
        {
            _context = context;
        }

        public List<Certification> GetAll() => _context.Certifications.ToList();

        public Certification GetById(string id) => _context.Certifications.Find(id);

        public List<Certification> GetByDivision(string division) => 
            _context.Certifications.Where(c => c.Division == division).ToList();
    }
}
