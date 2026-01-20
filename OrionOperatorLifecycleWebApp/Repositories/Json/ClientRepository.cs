using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public class ClientRepository : IClientRepository
    {
        private readonly string _jsonPath;

        public ClientRepository()
        {
            _jsonPath = Path.Combine(Directory.GetCurrentDirectory(), "App_Data", "pay_Clients.json");
        }

        public List<Client> GetAll()
        {
            if (!File.Exists(_jsonPath))
                return new List<Client>();

            var json = File.ReadAllText(_jsonPath);
            return JsonSerializer.Deserialize<List<Client>>(json) ?? new List<Client>();
        }

        public Client? GetById(string id)
        {
            return GetAll().FirstOrDefault(c => c.Id == id);
        }
    }
}
