using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;

namespace OrionOperatorLifecycleWebApp.Services
{
    public interface ICertificationService
    {
        List<Certification> GetAllCertifications();
        Certification GetCertificationById(string id);
        List<Certification> GetCertificationsByDivision(string division);
    }
}