using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;

namespace OrionOperatorLifecycleWebApp.Services
{
    public interface IRequirementService
    {
        List<Requirement> GetAllRequirements();
        Requirement GetRequirement(string pizzaStatusId, string division);
        void SaveAllRequirements(List<Requirement> requirements);
    }
}