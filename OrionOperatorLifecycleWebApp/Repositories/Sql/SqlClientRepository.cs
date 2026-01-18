using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Repositories.Sql
{
    public class SqlClientRepository : IClientRepository
    {
        private readonly OrionDbContext _context;

        public SqlClientRepository(OrionDbContext context)
        {
            _context = context;
        }

        public List<Client> GetAll()
        {
            return _context.Clients.ToList();
        }

        public Client? GetById(string id)
        {
            return _context.Clients.FirstOrDefault(c => c.Id == id);
        }
    }
}
