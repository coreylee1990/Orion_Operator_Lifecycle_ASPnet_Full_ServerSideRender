using System.Text.Json.Serialization;

namespace OrionOperatorLifecycleWebApp.Models
{
    public class StatusType
    {
        [JsonPropertyName("Id")]
        public string Id { get; set; }
        
        [JsonPropertyName("Status")]
        public string Status { get; set; }
        
        [JsonPropertyName("DivisionID")]
        public string DivisionId { get; set; }
        
        [JsonPropertyName("OrderID")]
        public string OrderId { get; set; }
        
        [JsonPropertyName("isDeleted")]
        public bool? IsDeleted { get; set; }
        
        // This links the StatusType to an actual PizzaStatus (the workflow definition)
        [JsonPropertyName("PizzaStatusID")]
        public string PizzaStatusId { get; set; }
    }
}