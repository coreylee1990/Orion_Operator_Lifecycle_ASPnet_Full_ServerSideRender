using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;

namespace OrionOperatorLifecycleWebApp.Services
{
    public interface IClientService
    {
        List<Client> GetAllClients();
        Client? GetClientById(string id);
    }
}
