using Microsoft.Extensions.Caching.Memory;
using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;
using System.Collections.Generic;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Services
{
    public class StatusTypeService : IStatusTypeService
    {
        private readonly IStatusTypeRepository _statusTypeRepository;
        private readonly IMemoryCache _cache;
        private const string CACHE_KEY_ALL = "StatusTypes_All";
        private static readonly TimeSpan CACHE_DURATION = TimeSpan.FromMinutes(10);

        public StatusTypeService(IStatusTypeRepository statusTypeRepository, IMemoryCache cache)
        {
            _statusTypeRepository = statusTypeRepository;
            _cache = cache;
        }

        public List<StatusType> GetAllStatusTypes()
        {
            return _cache.GetOrCreate(CACHE_KEY_ALL, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CACHE_DURATION;
                return _statusTypeRepository.GetAll();
            }) ?? new List<StatusType>();
        }

        public StatusType GetStatusTypeById(string id) => _statusTypeRepository.GetById(id);
        
        public List<StatusType> GetStatusTypesByDivision(string divisionId) => _statusTypeRepository.GetByDivision(divisionId);

        public void SaveAllStatusTypes(List<StatusType> statusTypes)
        {
            _statusTypeRepository.SaveAll(statusTypes);
            _cache.Remove(CACHE_KEY_ALL); // Invalidate cache
        }
    }
}
