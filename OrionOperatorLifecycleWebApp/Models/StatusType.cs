namespace OrionOperatorLifecycleWebApp.Models
{
    public class StatusType
    {
        public string Id { get; set; }
        public string Status { get; set; }
        public string DivisionId { get; set; }
        public string OrderId { get; set; }
        public bool IsDeleted { get; set; }
    }
}