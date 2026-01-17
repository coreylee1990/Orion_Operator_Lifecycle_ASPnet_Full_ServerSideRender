using System.Text.Json.Serialization;

namespace OrionOperatorLifecycleWebApp.Models
{
    public class PizzaStatus
    {
        [JsonPropertyName("ID")]
        public string Id { get; set; }
        
        [JsonPropertyName("Status")]
        public string Status { get; set; }
        
        [JsonPropertyName("Description")]
        public string Description { get; set; }
        
        [JsonPropertyName("IsOperator")]
        public bool? IsOperator { get; set; }
        
        [JsonPropertyName("IsProvider")]
        public bool? IsProvider { get; set; }
        
        [JsonPropertyName("isAuto")]
        public bool IsAuto { get; set; }
    }
}
