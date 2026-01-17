using System.Text.Json.Serialization;

namespace OrionOperatorLifecycleWebApp.Models
{
    public class CertType
    {
        [JsonPropertyName("ID")]
        public string Id { get; set; }
        
        [JsonPropertyName("Certification")]
        public string Certification { get; set; }
        
        [JsonPropertyName("Description")]
        public string Description { get; set; }
        
        [JsonPropertyName("DivisionID")]
        public string DivisionId { get; set; }
        
        [JsonPropertyName("PizzaStatusID")]
        public string PizzaStatusId { get; set; }
        
        [JsonPropertyName("isDeleted")]
        public bool? IsDeleted { get; set; }
    }
}