using System.Text.Json.Serialization;

namespace OrionOperatorLifecycleWebApp.Models
{
    public class Client
    {
        [JsonPropertyName("ID")]
        public string Id { get; set; } = string.Empty;
        
        [JsonPropertyName("Description")]
        public string Description { get; set; } = string.Empty;
        
        [JsonPropertyName("Contact")]
        public string Contact { get; set; } = string.Empty;
        
        [JsonPropertyName("PhoneNumber")]
        public string PhoneNumber { get; set; } = string.Empty;
        
        [JsonPropertyName("City")]
        public string? City { get; set; }
        
        [JsonPropertyName("State")]
        public string? State { get; set; }
        
        [JsonPropertyName("ZipCode")]
        public string? ZipCode { get; set; }
    }
}
