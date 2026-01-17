using System.Collections.Generic;
using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class CertTypeService : ICertTypeService
    {
        private readonly ICertTypeRepository _repository;

        public CertTypeService(ICertTypeRepository repository)
        {
            _repository = repository;
        }

        public List<CertType> GetAllCertTypes()
        {
            return _repository.GetAll();
        }

        public void SaveAllCertTypes(List<CertType> certTypes)
        {
            _repository.SaveAll(certTypes);
        }
    }
}
