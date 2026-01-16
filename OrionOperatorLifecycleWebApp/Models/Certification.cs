namespace OrionOperatorLifecycleWebApp.Models
{
    public class Certification
    {
        public string CertificationId { get; set; }
        
        public string Cert { get; set; }
        
        public string IsApproved { get; set; }
        
        public string IsDeleted { get; set; }
        
        public string Division { get; set; } // DivisionID in JSON
        
        public string CertTypeId { get; set; }
        
        public string OperatorId { get; set; }
    }
}