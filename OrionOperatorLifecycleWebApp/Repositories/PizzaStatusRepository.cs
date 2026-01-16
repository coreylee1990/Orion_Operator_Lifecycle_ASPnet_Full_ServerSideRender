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
            return JsonSerializer.Deserialize<List<PizzaStatus>>(json) ?? new List<PizzaStatus>();
        }

        public PizzaStatus GetById(int id) => GetAll().FirstOrDefault(p => p.Id == id);
    }
}