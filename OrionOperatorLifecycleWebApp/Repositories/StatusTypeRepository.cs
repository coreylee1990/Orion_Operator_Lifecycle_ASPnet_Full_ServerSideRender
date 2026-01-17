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
            var options = new JsonSerializerOptions { WriteIndented = true };
            var json = JsonSerializer.Serialize(statusTypes, options);
            File.WriteAllText(_filePath, json);
        }
    }
}