using System.Collections.Generic;
using System.Linq;
using OrionOperatorLifecycleWebApp.Models;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public class CertTypeRepository : ICertTypeRepository
    {
        private readonly string _filePath;

        public CertTypeRepository(string contentRootPath)
        {
             _filePath = System.IO.Path.Combine(contentRootPath, "App_Data", "pay_CertTypes.json");
        }

        public List<CertType> GetAll()
        {
            if (!System.IO.File.Exists(_filePath))
                return new List<CertType>();

            var json = System.IO.File.ReadAllText(_filePath);
            var options = new System.Text.Json.JsonSerializerOptions 
            { 
                 PropertyNameCaseInsensitive = true 
            };
            
            try 
            {
                return System.Text.Json.JsonSerializer.Deserialize<List<CertType>> (json, options);
            }
            catch
            {
                return new List<CertType>();
            }
        }

        public List<CertType> GetByClient(string clientId)
        {
            // JSON mode doesn't attach ClientId directly to CertTypes; return all
            // and let the caller filter via PizzaStatus relationships if needed.
            return GetAll();
        }

        public List<CertType> GetByPizzaStatusIds(IEnumerable<string> pizzaStatusIds)
        {
            if (pizzaStatusIds == null)
                return new List<CertType>();

            var idSet = new HashSet<string>(pizzaStatusIds.Where(id => !string.IsNullOrWhiteSpace(id)));
            if (idSet.Count == 0)
                return new List<CertType>();

            var all = GetAll();
            return all.Where(ct => !string.IsNullOrWhiteSpace(ct.PizzaStatusId) && idSet.Contains(ct.PizzaStatusId)).ToList();
        }

        public void SaveAll(List<CertType> certTypes)
        {
            if (certTypes == null || certTypes.Count == 0)
            {
                return; // Nothing to save
            }

            // MERGE logic: Load existing, update/add modified items, preserve others
            var existing = GetAll();
            var existingById = existing.ToDictionary(c => c.Id ?? "", c => c);

            foreach (var certType in certTypes)
            {
                var id = certType.Id ?? "";
                if (string.IsNullOrEmpty(id) || id.StartsWith("TEMP-"))
                {
                    // New item - generate a real ID and add
                    certType.Id = System.Guid.NewGuid().ToString();
                    existing.Add(certType);
                }
                else if (existingById.ContainsKey(id))
                {
                    // Update existing item
                    var idx = existing.FindIndex(c => c.Id == id);
                    if (idx >= 0)
                    {
                        existing[idx] = certType;
                    }
                }
                else
                {
                    // New item with ID - add it
                    existing.Add(certType);
                }
            }

            var options = new System.Text.Json.JsonSerializerOptions { WriteIndented = true };
            var json = System.Text.Json.JsonSerializer.Serialize(existing, options);
            System.IO.File.WriteAllText(_filePath, json);
        }
    }
}
