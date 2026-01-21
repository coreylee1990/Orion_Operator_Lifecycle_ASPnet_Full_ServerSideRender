using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public class PizzaStatusRepository : IPizzaStatusRepository
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

        public void SaveAll(List<PizzaStatus> pizzaStatuses)
        {
            if (pizzaStatuses == null || pizzaStatuses.Count == 0)
            {
                return; // Nothing to save
            }

            // MERGE logic: Load existing, update/add modified items, preserve others
            var existing = GetAll();
            var existingById = existing.ToDictionary(p => p.Id ?? "", p => p);

            foreach (var pizzaStatus in pizzaStatuses)
            {
                var id = pizzaStatus.Id ?? "";
                if (string.IsNullOrEmpty(id))
                {
                    // New item without ID - generate one and add
                    pizzaStatus.Id = System.Guid.NewGuid().ToString();
                    existing.Add(pizzaStatus);
                }
                else if (existingById.ContainsKey(id))
                {
                    // Update existing item
                    var idx = existing.FindIndex(p => p.Id == id);
                    if (idx >= 0)
                    {
                        existing[idx] = pizzaStatus;
                    }
                }
                else
                {
                    // New item with ID - add it
                    existing.Add(pizzaStatus);
                }
            }

            var options = new JsonSerializerOptions { WriteIndented = true };
            var json = JsonSerializer.Serialize(existing, options);
            File.WriteAllText(_filePath, json);
        }

        public void Add(PizzaStatus pizzaStatus)
        {
            if (pizzaStatus == null) return;
            if (string.IsNullOrWhiteSpace(pizzaStatus.Id))
            {
                pizzaStatus.Id = Guid.NewGuid().ToString().ToUpper();
            }
            var existing = GetAll();
            existing.Add(pizzaStatus);
            var options = new JsonSerializerOptions { WriteIndented = true };
            var json = JsonSerializer.Serialize(existing, options);
            File.WriteAllText(_filePath, json);
        }
    }
}
