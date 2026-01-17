using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;
using System.Collections.Generic;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class PizzaStatusService : IPizzaStatusService
    {
        private readonly IPizzaStatusRepository _pizzaStatusRepository;

        public PizzaStatusService(IPizzaStatusRepository pizzaStatusRepository)
        {
            _pizzaStatusRepository = pizzaStatusRepository;
        }

        public List<PizzaStatus> GetAllPizzaStatuses() => _pizzaStatusRepository.GetAll();
        public PizzaStatus GetPizzaStatusById(string id) => _pizzaStatusRepository.GetById(id);
    }
}