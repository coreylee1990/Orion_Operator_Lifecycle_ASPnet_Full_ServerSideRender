using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;
using System.Collections.Generic;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class OperatorService : IOperatorService
    {
        private readonly IOperatorRepository _operatorRepository;

        public OperatorService(IOperatorRepository operatorRepository)
        {
            _operatorRepository = operatorRepository;
        }

        public List<Operator> GetAllOperators() => _operatorRepository.GetAll();
        public Operator GetOperatorById(string id) => _operatorRepository.GetById(id);
        public List<Operator> GetOperatorsByDivision(string divisionId) => _operatorRepository.GetByDivision(divisionId);

        public void UpdateOperatorStatus(string operatorId, string newStatusName, string newStatusId, string newOrderId)
        {
            _operatorRepository.UpdateStatus(operatorId, newStatusName, newStatusId, newOrderId);
        }

        public void BulkUpdateOperatorStatus(List<string> operatorIds, string newStatusName, string newStatusId, string newOrderId)
        {
            foreach (var operatorId in operatorIds)
            {
                _operatorRepository.UpdateStatus(operatorId, newStatusName, newStatusId, newOrderId);
            }
        }
    }
}