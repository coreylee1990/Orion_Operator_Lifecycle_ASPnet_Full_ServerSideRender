using System.Collections.Generic;

namespace OrionOperatorLifecycleWebApp.Models
{
    public class Operator
    {
        public string Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string DivisionId { get; set; }
        public string StatusName { get; set; }
        public List<Certification> Certifications { get; set; }
    }
}