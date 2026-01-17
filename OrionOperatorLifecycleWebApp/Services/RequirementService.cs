using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;
using System.Collections.Generic;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class RequirementService : IRequirementService
    {
        private readonly IRequirementRepository _requirementRepository;

        public RequirementService(IRequirementRepository requirementRepository)
        {
            _requirementRepository = requirementRepository;
        }

        public List<Requirement> GetAllRequirements() => _requirementRepository.GetAll();
        public Requirement GetRequirement(string pizzaStatusId, string division) =>
            _requirementRepository.GetByPizzaStatusAndDivision(pizzaStatusId, division);
        public void SaveAllRequirements(List<Requirement> requirements) => _requirementRepository.SaveAll(requirements);
    }
}