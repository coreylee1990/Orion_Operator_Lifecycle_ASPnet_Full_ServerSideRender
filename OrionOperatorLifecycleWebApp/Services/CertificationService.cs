using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;
using System.Collections.Generic;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class CertificationService : ICertificationService
    {
        private readonly ICertificationRepository _certificationRepository;

        public CertificationService(ICertificationRepository certificationRepository)
        {
            _certificationRepository = certificationRepository;
        }

        public List<Certification> GetAllCertifications() => _certificationRepository.GetAll();
        public Certification GetCertificationById(string id) => _certificationRepository.GetById(id);
        public List<Certification> GetCertificationsByDivision(string division) => _certificationRepository.GetByDivision(division);
        public List<Certification> GetCertificationsByOperatorIds(List<string> operatorIds) => _certificationRepository.GetByOperatorIds(operatorIds);
    }
}