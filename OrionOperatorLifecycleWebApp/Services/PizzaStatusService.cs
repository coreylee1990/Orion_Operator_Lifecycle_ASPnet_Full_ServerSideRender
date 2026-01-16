using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class PizzaStatusService : IPizzaStatusService
    {
        private readonly Repositories.PizzaStatusRepository _pizzaStatusRepository;

        public PizzaStatusService(Repositories.PizzaStatusRepository pizzaStatusRepository)
        {
            _pizzaStatusRepository = pizzaStatusRepository;
        }

        public List<PizzaStatus> GetAllPizzaStatuses() => _pizzaStatusRepository.GetAll();
        public PizzaStatus GetPizzaStatusById(string id) => _pizzaStatusRepository.GetById(id);
    }
}