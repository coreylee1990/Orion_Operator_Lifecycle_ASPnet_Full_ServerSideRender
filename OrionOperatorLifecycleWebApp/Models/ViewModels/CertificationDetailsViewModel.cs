using System.Collections.Generic;

namespace OrionOperatorLifecycleWebApp.Models.ViewModels
{
    public class CertificationDetailsViewModel
    {
        public string CertName { get; set; }
        public string CertTypeId { get; set; }
        public string PizzaStatusId { get; set; }
        public string Division { get; set; }
        public List<string> StatusesUsing { get; set; } = new List<string>();
        public List<OperatorWithCertStatus> OperatorsWithCert { get; set; } = new List<OperatorWithCertStatus>();
        public List<OperatorBasicInfo> OperatorsMissingCert { get; set; } = new List<OperatorBasicInfo>();
    }

    public class OperatorWithCertStatus
    {
        public string Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string StatusName { get; set; }
        public string DivisionId { get; set; }
        public bool IsExpired { get; set; }
    }

    public class OperatorBasicInfo
    {
        public string Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string StatusName { get; set; }
        public string DivisionId { get; set; }
    }
}
