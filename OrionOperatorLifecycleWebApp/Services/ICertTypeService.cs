using System.Collections.Generic;
using OrionOperatorLifecycleWebApp.Models;

namespace OrionOperatorLifecycleWebApp.Services
{
    public interface ICertTypeService
    {
        List<CertType> GetAllCertTypes();
        void SaveAllCertTypes(List<CertType> certTypes);
    }
}
