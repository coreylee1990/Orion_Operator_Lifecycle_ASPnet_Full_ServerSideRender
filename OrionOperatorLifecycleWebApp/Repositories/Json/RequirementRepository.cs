using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public class RequirementRepository : IRequirementRepository
    {
        private readonly string _filePath = "App_Data/pay_PizzaStatusRequirements.json";

        public List<Requirement> GetAll()
        {
            if (!File.Exists(_filePath)) return new List<Requirement>();
            var json = File.ReadAllText(_filePath);
            if (string.IsNullOrWhiteSpace(json) || json.Trim() == "null")
                return new List<Requirement>();
            using var doc = JsonDocument.Parse(json);
            var list = new List<Requirement>();
            if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var element in doc.RootElement.EnumerateArray())
                {
                    var req = JsonSerializer.Deserialize<Requirement>(element.GetRawText());
                    if (req != null) list.Add(req);
                }
            }
            else if (doc.RootElement.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in doc.RootElement.EnumerateObject())
                {
                    var req = JsonSerializer.Deserialize<Requirement>(prop.Value.GetRawText());
                    if (req != null) list.Add(req);
                }
            }
            return list;
        }

        public Requirement GetByPizzaStatusAndDivision(string pizzaStatusId, string division) =>
            GetAll().FirstOrDefault(r => r.PizzaStatusId == pizzaStatusId && r.Division == division);

        public void SaveAll(List<Requirement> requirements)
        {
            var json = JsonSerializer.Serialize(requirements);
            File.WriteAllText(_filePath, json);
        }
    }
}
