using System.Collections.Generic;
using OrionOperatorLifecycleWebApp.Models;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public interface IRequirementRepository
    {
        List<Requirement> GetAll();
        Requirement GetByPizzaStatusAndDivision(string pizzaStatusId, string division);
        void SaveAll(List<Requirement> requirements);
    }
}
