using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;
using System.Collections.Generic;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class StatusTypeService : IStatusTypeService
    {
        private readonly IStatusTypeRepository _statusTypeRepository;

        public StatusTypeService(IStatusTypeRepository statusTypeRepository)
        {
            _statusTypeRepository = statusTypeRepository;
        }

        public List<StatusType> GetAllStatusTypes() => _statusTypeRepository.GetAll();
        public StatusType GetStatusTypeById(string id) => _statusTypeRepository.GetById(id);
        public List<StatusType> GetStatusTypesByDivision(string divisionId) => _statusTypeRepository.GetByDivision(divisionId);

        public void SaveAllStatusTypes(List<StatusType> statusTypes)
        {
            _statusTypeRepository.SaveAll(statusTypes);
        }
    }
}
