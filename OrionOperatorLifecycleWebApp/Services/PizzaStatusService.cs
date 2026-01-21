using Microsoft.Extensions.Caching.Memory;
using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;
using System.Collections.Generic;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class PizzaStatusService : IPizzaStatusService
    {
        private readonly IPizzaStatusRepository _pizzaStatusRepository;
        private readonly IMemoryCache _cache;
        private const string CACHE_KEY_ALL = "PizzaStatuses_All";
        private static readonly TimeSpan CACHE_DURATION = TimeSpan.FromMinutes(10);

        public PizzaStatusService(IPizzaStatusRepository pizzaStatusRepository, IMemoryCache cache)
        {
            _pizzaStatusRepository = pizzaStatusRepository;
            _cache = cache;
        }

        public List<PizzaStatus> GetAllPizzaStatuses()
        {
            return _cache.GetOrCreate(CACHE_KEY_ALL, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CACHE_DURATION;
                return _pizzaStatusRepository.GetAll();
            }) ?? new List<PizzaStatus>();
        }

        public PizzaStatus GetPizzaStatusById(string id) => _pizzaStatusRepository.GetById(id);

        public void SaveAllPizzaStatuses(List<PizzaStatus> pizzaStatuses)
        {
            _pizzaStatusRepository.SaveAll(pizzaStatuses);
            _cache.Remove(CACHE_KEY_ALL);
        }

        public void AddPizzaStatus(PizzaStatus pizzaStatus)
        {
            _pizzaStatusRepository.Add(pizzaStatus);
            _cache.Remove(CACHE_KEY_ALL);
        }
    }
}