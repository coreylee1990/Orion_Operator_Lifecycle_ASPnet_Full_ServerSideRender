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
        
        [JsonPropertyName("ClientID")]
        public string ClientId { get; set; }
        
        [JsonPropertyName("IsOperator")]
        public bool? IsOperator { get; set; }
        
        [JsonPropertyName("IsProvider")]
        public bool? IsProvider { get; set; }
        
        [JsonPropertyName("isAuto")]
        public bool IsAuto { get; set; }
        
        [JsonPropertyName("MobileAppOrder")]
        [JsonConverter(typeof(FlexibleNullableIntConverter))]
        public int? MobileAppOrder { get; set; }
        
        [JsonPropertyName("isActive")]
        [JsonConverter(typeof(FlexibleNullableBoolConverter))]
        public bool? IsActive { get; set; }
        
        [JsonPropertyName("NounID")]
        public string? NounId { get; set; }
        
        [JsonPropertyName("SubNounID")]
        public string? SubNounId { get; set; }
    }
}
