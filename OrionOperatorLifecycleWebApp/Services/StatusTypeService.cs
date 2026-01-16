using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class StatusTypeService : IStatusTypeService
    {
        private readonly Repositories.StatusTypeRepository _statusTypeRepository;

        public StatusTypeService(Repositories.StatusTypeRepository statusTypeRepository)
        {
            _statusTypeRepository = statusTypeRepository;
        }

        public List<StatusType> GetAllStatusTypes() => _statusTypeRepository.GetAll();
        public StatusType GetStatusTypeById(string id) => _statusTypeRepository.GetById(id);
        public List<StatusType> GetStatusTypesByDivision(string divisionId) => _statusTypeRepository.GetByDivision(divisionId);
    }
}