using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public class PizzaStatusRepository
    {
        private readonly string _filePath = "App_Data/pay_PizzaStatuses.json";

        public List<PizzaStatus> GetAll()
        {
            if (!File.Exists(_filePath)) return new List<PizzaStatus>();
            var json = File.ReadAllText(_filePath);
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<List<PizzaStatus>>(json, options) ?? new List<PizzaStatus>();
        }

        public PizzaStatus GetById(string id) => GetAll().FirstOrDefault(p => p.Id == id);

        public PizzaStatus GetByStatus(string status) => 
            GetAll().FirstOrDefault(p => p.Status != null && p.Status.Equals(status, System.StringComparison.OrdinalIgnoreCase));
    }
}