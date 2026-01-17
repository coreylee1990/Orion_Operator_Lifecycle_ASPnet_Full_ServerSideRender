using System.Collections.Generic;
using OrionOperatorLifecycleWebApp.Models;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public interface ICertificationRepository
    {
        List<Certification> GetAll();
        Certification GetById(string id);
        List<Certification> GetByDivision(string division);
    }
}
