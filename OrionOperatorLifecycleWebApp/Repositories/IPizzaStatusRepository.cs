using System.Collections.Generic;
using OrionOperatorLifecycleWebApp.Models;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public interface IPizzaStatusRepository
    {
        List<PizzaStatus> GetAll();
        PizzaStatus GetById(string id);
        PizzaStatus GetByStatus(string status);
    }
}
