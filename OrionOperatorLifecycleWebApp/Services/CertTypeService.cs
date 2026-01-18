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

        public void SaveAllCertTypes(List<CertType> certTypes)
        {
            _repository.SaveAll(certTypes);
            // Invalidate cache after save
            _cache.Remove(CACHE_KEY);
        }
    }
}
