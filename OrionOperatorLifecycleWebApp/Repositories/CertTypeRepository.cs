using System.Collections.Generic;
using OrionOperatorLifecycleWebApp.Models;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public class CertTypeRepository : ICertTypeRepository
    {
        // This is a placeholder for the JSON implementation if needed,
        // but currently DataController reads JSON directly.
        // We will implement this to support the Service pattern, 
        // allowing DataController to be agnostic.
        
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
            
            // Note: The JSON uses "ID", "Certification", "DivisionID" etc.
            // Our model uses Id, Certification, DivisionId. 
            // We might need custom serialization if PropertyNameCaseInsensitive isn't enough for ID vs Id convention/mapping.
            // But DataController just dumped the JSON string before.
            // For now, let's return empty or try to deserialize.
            
            try 
            {
                return System.Text.Json.JsonSerializer.Deserialize<List<CertType>> (json, options);
            }
            catch
            {
                return new List<CertType>();
            }
        }

        public void SaveAll(List<CertType> certTypes)
        {
            var options = new System.Text.Json.JsonSerializerOptions { WriteIndented = true };
            var json = System.Text.Json.JsonSerializer.Serialize(certTypes, options);
            System.IO.File.WriteAllText(_filePath, json);
        }
    }
}
