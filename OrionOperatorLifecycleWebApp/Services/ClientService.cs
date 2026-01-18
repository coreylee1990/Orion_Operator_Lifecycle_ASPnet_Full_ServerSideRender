using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;
using System.Collections.Generic;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class ClientService : IClientService
    {
        private readonly IClientRepository _clientRepository;

        public ClientService(IClientRepository clientRepository)
        {
            _clientRepository = clientRepository;
        }

        public List<Client> GetAllClients() => _clientRepository.GetAll();
        public Client? GetClientById(string id) => _clientRepository.GetById(id);
    }
}
