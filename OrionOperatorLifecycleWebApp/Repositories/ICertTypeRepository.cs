using System.Collections.Generic;
using OrionOperatorLifecycleWebApp.Models;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public interface ICertTypeRepository
    {
        List<CertType> GetAll();
        void SaveAll(List<CertType> certTypes);
    }
}
