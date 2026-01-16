namespace OrionOperatorLifecycleWebApp.Models
{
    public class Certification
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string IsApproved { get; set; }
        public string IsDeleted { get; set; }
        public string Division { get; set; }
        public string Status { get; set; }
        public string IsExpired { get; set; }
    }
}