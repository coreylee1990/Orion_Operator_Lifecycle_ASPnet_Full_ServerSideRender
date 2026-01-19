using System.Text.Json;
using OrionOperatorLifecycleWebApp.Models;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public interface IStatusTrackerRepository
    {
        List<StatusTracker> GetAll();
    }

    public class StatusTrackerRepository : IStatusTrackerRepository
    {
        private readonly string _dataFilePath = "";
        private List<StatusTracker>? _cachedData;
        private DateTime _lastLoadTime;
        private readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(5);

        public StatusTrackerRepository(IWebHostEnvironment env, IConfiguration configuration)
        {
            var useSqlDatabase = configuration.GetValue<bool>("UseSqlDatabase", true);
            
            if (!useSqlDatabase)
            {
                _dataFilePath = Path.Combine(env.ContentRootPath, "App_Data", "pay_StatusTracker.json");
            }
        }

        public List<StatusTracker> GetAll()
        {
            if (!File.Exists(_dataFilePath))
            {
                return new List<StatusTracker>();
            }

            // Return cached data if still valid
            if (_cachedData != null && DateTime.Now - _lastLoadTime < _cacheExpiration)
            {
                return _cachedData;
            }

            try
            {
                var json = File.ReadAllText(_dataFilePath);
                _cachedData = JsonSerializer.Deserialize<List<StatusTracker>>(json) ?? new List<StatusTracker>();
                _lastLoadTime = DateTime.Now;
                return _cachedData;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading status tracker data: {ex.Message}");
                return new List<StatusTracker>();
            }
        }
    }
}
