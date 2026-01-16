using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class CertificationService : ICertificationService
    {
        private readonly Repositories.CertificationRepository _certificationRepository;

        public CertificationService(Repositories.CertificationRepository certificationRepository)
        {
            _certificationRepository = certificationRepository;
        }

        public List<Certification> GetAllCertifications() => _certificationRepository.GetAll();
        public Certification GetCertificationById(int id) => _certificationRepository.GetById(id);
        public List<Certification> GetCertificationsByDivision(string division) => _certificationRepository.GetByDivision(division);
    }
}