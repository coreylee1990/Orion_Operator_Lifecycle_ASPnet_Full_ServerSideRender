using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public class StatusTypeRepository : IStatusTypeRepository
    {
        private readonly string _filePath = "App_Data/pay_StatusTypes.json";

        public List<StatusType> GetAll()
        {
            if (!File.Exists(_filePath)) return new List<StatusType>();
            var json = File.ReadAllText(_filePath);
            return JsonSerializer.Deserialize<List<StatusType>>(json) ?? new List<StatusType>();
        }

        public StatusType GetById(string id) => GetAll().FirstOrDefault(s => s.Id == id);

        public List<StatusType> GetByDivision(string divisionId) => GetAll().Where(s => s.DivisionId == divisionId).ToList();

        public void SaveAll(List<StatusType> statusTypes)
        {
            if (statusTypes == null || statusTypes.Count == 0)
            {
                return; // Nothing to save
            }

            // MERGE logic: Load existing, update/add modified items, preserve others
            var existing = GetAll();
            var existingById = existing.ToDictionary(s => s.Id ?? "", s => s);

            foreach (var status in statusTypes)
            {
                var id = status.Id ?? "";
                if (string.IsNullOrEmpty(id))
                {
                    // New item without ID - generate one and add
                    status.Id = System.Guid.NewGuid().ToString();
                    existing.Add(status);
                }
                else if (existingById.ContainsKey(id))
                {
                    // Update existing item
                    var idx = existing.FindIndex(s => s.Id == id);
                    if (idx >= 0)
                    {
                        existing[idx] = status;
                    }
                }
                else
                {
                    // New item with ID - add it
                    existing.Add(status);
                }
            }

            var options = new JsonSerializerOptions { WriteIndented = true };
            var json = JsonSerializer.Serialize(existing, options);
            File.WriteAllText(_filePath, json);
        }

        public void Add(StatusType statusType)
        {
            if (statusType == null) return;

            // Generate ID if not provided
            if (string.IsNullOrEmpty(statusType.Id))
            {
                statusType.Id = System.Guid.NewGuid().ToString().ToUpper();
            }

            var existing = GetAll();
            existing.Add(statusType);

            var options = new JsonSerializerOptions { WriteIndented = true };
            var json = JsonSerializer.Serialize(existing, options);
            File.WriteAllText(_filePath, json);
        }
    }
}