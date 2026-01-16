namespace OrionOperatorLifecycleWebApp.Models
{
    public class PizzaStatus
    {
        public string Id { get; set; }
        public string Status { get; set; }
        public string Description { get; set; }
        public bool? IsOperator { get; set; }
        public bool? IsProvider { get; set; }
        public bool IsAuto { get; set; }
    }
}