using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace OrionOperatorLifecycleWebApp.Models
{
    public class Operator
    {
        [JsonPropertyName("ID")]
        public string? Id { get; set; }
        
        [JsonPropertyName("FirstName")]
        public string? FirstName { get; set; }
        
        [JsonPropertyName("LastName")]
        public string? LastName { get; set; }
        
        [JsonPropertyName("Email")]
        public string? Email { get; set; }
        
        [JsonPropertyName("Mobile")]
        public string? Mobile { get; set; }
        
        [JsonPropertyName("DivisionID")]
        public string? DivisionId { get; set; }
        
        [JsonPropertyName("StatusName")]
        public string? StatusName { get; set; }
        
        [JsonPropertyName("StatusID")]
        public string? StatusId { get; set; }
        
        [JsonPropertyName("OrderID")]
        public string? OrderId { get; set; }
        
        [JsonPropertyName("isDeleted")]
        public bool? IsDeleted { get; set; }

        [JsonIgnore]
        public List<Certification> Certifications { get; set; }
    }
}
