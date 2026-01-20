using System.Collections.Generic;
using Microsoft.Extensions.Caching.Memory;
using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class CertTypeService : ICertTypeService
    {
        private readonly ICertTypeRepository _repository;
        private readonly IMemoryCache _cache;
        private const string CACHE_KEY = "CertTypes_All";
        private static readonly TimeSpan CACHE_DURATION = TimeSpan.FromMinutes(10);

        public CertTypeService(ICertTypeRepository repository, IMemoryCache cache)
        {
            _repository = repository;
            _cache = cache;
        }

        public List<CertType> GetAllCertTypes()
        {
            return _cache.GetOrCreate(CACHE_KEY, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CACHE_DURATION;
                return _repository.GetAll();
            }) ?? new List<CertType>();
        }

        public List<CertType> GetCertTypesForClient(string clientId)
        {
            if (string.IsNullOrWhiteSpace(clientId))
            {
                return GetAllCertTypes();
            }

            // For client-scoped queries, delegate directly to the repository.
            // Caching is handled only for the full GetAllCertTypes path to avoid
            // complex invalidation of per-client entries on save.
            return _repository.GetByClient(clientId) ?? new List<CertType>();
        }

        public List<CertType> GetCertTypesForPizzaStatuses(IEnumerable<string> pizzaStatusIds)
        {
            if (pizzaStatusIds == null)
            {
                return new List<CertType>();
            }

            var ids = pizzaStatusIds
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .ToList();

            if (ids.Count == 0)
            {
                return new List<CertType>();
            }

            // No caching here: this is a highly scoped, per-view query.
            return _repository.GetByPizzaStatusIds(ids) ?? new List<CertType>();
        }

        public void SaveAllCertTypes(List<CertType> certTypes)
        {
            _repository.SaveAll(certTypes);
            // Invalidate cache after save
            _cache.Remove(CACHE_KEY);
        }
    }
}
