using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;

namespace OrionOperatorLifecycleWebApp.Services
{
    public interface IPizzaStatusService
    {
        List<PizzaStatus> GetAllPizzaStatuses();
        PizzaStatus GetPizzaStatusById(string id);
        // Add more methods as needed
    }
}