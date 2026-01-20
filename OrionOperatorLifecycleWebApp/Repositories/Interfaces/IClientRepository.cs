using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public interface IClientRepository
    {
        List<Client> GetAll();
        Client? GetById(string id);
    }
}
