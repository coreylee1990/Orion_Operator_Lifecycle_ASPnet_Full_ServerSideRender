using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public class CertificationRepository
    {
        private readonly string _filePath = "App_Data/pay_Certifications.json";

        public List<Certification> GetAll()
        {
            if (!File.Exists(_filePath)) return new List<Certification>();
            var json = File.ReadAllText(_filePath);
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("certifications", out var certsElement) && certsElement.ValueKind == JsonValueKind.Array)
            {
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                return JsonSerializer.Deserialize<List<Certification>>(certsElement.GetRawText(), options) ?? new List<Certification>();
            }
            return new List<Certification>();
        }

        public Certification GetById(string id) => GetAll().FirstOrDefault(c => c.CertificationId == id);


        public List<Certification> GetByDivision(string division) => GetAll().Where(c => c.Division == division).ToList();
    }
}