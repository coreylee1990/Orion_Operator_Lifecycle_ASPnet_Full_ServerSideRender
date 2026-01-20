using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public class CertificationRepository : ICertificationRepository
    {
        private readonly string _filePath = "App_Data/pay_Certifications.json";

        public List<Certification> GetAll()
        {
            if (!File.Exists(_filePath)) return new List<Certification>();
            var json = File.ReadAllText(_filePath);
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            
            using var doc = JsonDocument.Parse(json);
            
            if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                return JsonSerializer.Deserialize<List<Certification>>(json, options) ?? new List<Certification>();
            }
            
            if (doc.RootElement.ValueKind == JsonValueKind.Object && 
                doc.RootElement.TryGetProperty("certifications", out var certsElement) && 
                certsElement.ValueKind == JsonValueKind.Array)
            {
                return JsonSerializer.Deserialize<List<Certification>>(certsElement.GetRawText(), options) ?? new List<Certification>();
            }
            
            return new List<Certification>();
        }

        public Certification GetById(string id) => GetAll().FirstOrDefault(c => c.CertificationId == id);


        public List<Certification> GetByDivision(string division) => GetAll().Where(c => c.Division == division).ToList();

        public List<Certification> GetByOperatorIds(List<string> operatorIds)
        {
            if (operatorIds == null || operatorIds.Count == 0)
            {
                return new List<Certification>();
            }

            var set = operatorIds.ToHashSet();
            return GetAll().Where(c => !string.IsNullOrEmpty(c.OperatorId) && set.Contains(c.OperatorId)).ToList();
        }
    }
}
