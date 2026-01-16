using System.Collections.Generic;

namespace OrionOperatorLifecycleWebApp.Models
{
    public class Requirement
    {
        public string PizzaStatusId { get; set; }
        public string Division { get; set; }
        public List<string> RequiredCertifications { get; set; }
    }
}