using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;

namespace OrionOperatorLifecycleWebApp.Services
{
    public interface IStatusTrackerService
    {
        List<StatusTracker> GetAllStatusTrackers();
        int? GetDaysInStatus(string operatorId, string currentStatusId);
    }

    public class StatusTrackerService : IStatusTrackerService
    {
        private readonly IStatusTrackerRepository _repository;

        public StatusTrackerService(IStatusTrackerRepository repository)
        {
            _repository = repository;
        }

        public List<StatusTracker> GetAllStatusTrackers()
        {
            return _repository.GetAll();
        }

        public int? GetDaysInStatus(string operatorId, string currentStatusId)
        {
            var allRecords = _repository.GetAll();
            
            // Find all records for this operator with the current status
            var currentStatusRecords = allRecords
                .Where(st => st.OperatorId == operatorId && st.StatusId == currentStatusId)
                .OrderByDescending(st => st.Date)
                .ToList();

            if (!currentStatusRecords.Any())
            {
                return null;
            }

            // Get the most recent record for this status
            var mostRecent = currentStatusRecords.First();
            var days = (DateTime.Now - mostRecent.Date).Days;

            return days;
        }
    }
}
