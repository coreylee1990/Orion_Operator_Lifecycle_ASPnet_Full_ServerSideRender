using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class OperatorService : IOperatorService
    {
        private readonly Repositories.OperatorRepository _operatorRepository;

        public OperatorService(Repositories.OperatorRepository operatorRepository)
        {
            _operatorRepository = operatorRepository;
        }

        public List<Operator> GetAllOperators() => _operatorRepository.GetAll();
        public Operator GetOperatorById(string id) => _operatorRepository.GetById(id);
        public List<Operator> GetOperatorsByDivision(string divisionId) => _operatorRepository.GetByDivision(divisionId);
    }
}