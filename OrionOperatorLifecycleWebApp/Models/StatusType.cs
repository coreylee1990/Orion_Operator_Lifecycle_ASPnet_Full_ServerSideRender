using System;
using System.Text.Json.Serialization;

namespace OrionOperatorLifecycleWebApp.Models
{
    public class StatusType
    {
        [JsonPropertyName("Id")]
        public string Id { get; set; }
        
        [JsonPropertyName("Status")]
        public string Status { get; set; }

        [JsonPropertyName("Description")]
        public string Description { get; set; }
        
        [JsonPropertyName("DivisionID")]
        public string DivisionId { get; set; }
        
        [JsonPropertyName("OrderID")]
        public string OrderId { get; set; }
        
        [JsonPropertyName("isDeleted")]
        public bool? IsDeleted { get; set; }
        
        // This links the StatusType to an actual PizzaStatus (the workflow definition)
        [JsonPropertyName("PizzaStatusID")]
        public string PizzaStatusId { get; set; }
        
        // Fleet flag - false means not Fleet
        [JsonPropertyName("Fleet")]
        public bool? Fleet { get; set; }
        
        // Providers flag - false means not Provider
        [JsonPropertyName("Providers")]
        public bool? Providers { get; set; }

        [JsonPropertyName("CertFlag")]
        public bool? CertFlag { get; set; }

        [JsonPropertyName("OutOfServiceFlag")]
        public bool? OutOfServiceFlag { get; set; }

        [JsonPropertyName("isTracked")]
        public bool? IsTracked { get; set; }

        [JsonPropertyName("isHireEvent")]
        public bool? IsHireEvent { get; set; }

        [JsonPropertyName("isTermEvent")]
        public bool? IsTermEvent { get; set; }

        [JsonPropertyName("isProjectedFill")]
        public bool? IsProjectedFill { get; set; }

        [JsonPropertyName("AgeDaysAlert")]
        public string AgeDaysAlert { get; set; }

        [JsonPropertyName("RecordAt")]
        public DateTime? RecordAt { get; set; }

        [JsonPropertyName("RecordBy")]
        public string RecordBy { get; set; }

        [JsonPropertyName("UpdateAt")]
        public DateTime? UpdateAt { get; set; }

        [JsonPropertyName("UpdateBy")]
        public string UpdateBy { get; set; }

        [JsonPropertyName("VideoUrl")]
        public string VideoUrl { get; set; }

        [JsonPropertyName("NounID")]
        public string NounId { get; set; }

        [JsonPropertyName("SubNounID")]
        public string SubNounId { get; set; }
    }
}