using System;
using System.Text.Json.Serialization;

namespace OrionOperatorLifecycleWebApp.Models
{
    public class Certification
    {
        [JsonPropertyName("CertificationID")]
        public string CertificationId { get; set; }
        
        [JsonPropertyName("Cert")]
        public string Cert { get; set; }
        
        [JsonPropertyName("isApproved")]
        public string IsApproved { get; set; }
        
        [JsonPropertyName("IsDeleted")]
        public string IsDeleted { get; set; }
        
        [JsonPropertyName("DivisionID")]
        public string Division { get; set; }
        
        [JsonPropertyName("CertTypeID")]
        public string CertTypeId { get; set; }
        
        [JsonPropertyName("OperatorID")]
        public string OperatorId { get; set; }

        [JsonPropertyName("Date")]
        [JsonConverter(typeof(FlexibleDateTimeConverter))]
        public DateTime? Date { get; set; }
        
        [JsonPropertyName("RecordAt")]
        [JsonConverter(typeof(FlexibleDateTimeConverter))]
        public DateTime? RecordAt { get; set; }
    }
}