using System.Collections.Generic;
using OrionOperatorLifecycleWebApp.Models;

namespace OrionOperatorLifecycleWebApp.Services
{
    public interface ICertTypeService
    {
        List<CertType> GetAllCertTypes();
        List<CertType> GetCertTypesForClient(string clientId);
        List<CertType> GetCertTypesForPizzaStatuses(IEnumerable<string> pizzaStatusIds);
        void SaveAllCertTypes(List<CertType> certTypes);
    }
}
