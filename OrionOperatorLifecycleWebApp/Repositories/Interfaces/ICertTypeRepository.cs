using System.Collections.Generic;
using OrionOperatorLifecycleWebApp.Models;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public interface ICertTypeRepository
    {
        List<CertType> GetAll();
        // SQL-backed implementation may optimize this by joining to PizzaStatus/Client.
        // JSON-backed implementation can simply return all cert types.
        List<CertType> GetByClient(string clientId);
        // Fetch cert types scoped to a specific set of PizzaStatus IDs.
        List<CertType> GetByPizzaStatusIds(IEnumerable<string> pizzaStatusIds);
        void SaveAll(List<CertType> certTypes);
    }
}
