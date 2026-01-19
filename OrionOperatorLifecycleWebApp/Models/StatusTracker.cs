using System.Text.Json.Serialization;

namespace OrionOperatorLifecycleWebApp.Models
{
    public class StatusTracker
    {
        [JsonPropertyName("ID")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("StatusID")]
        public string StatusId { get; set; } = string.Empty;

        [JsonPropertyName("OperatorID")]
        public string OperatorId { get; set; } = string.Empty;

        [JsonPropertyName("Date")]
        public DateTime Date { get; set; }

        [JsonPropertyName("DivisionID")]
        public string DivisionId { get; set; } = string.Empty;
    }
}
