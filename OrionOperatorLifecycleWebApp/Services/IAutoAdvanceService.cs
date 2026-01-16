using System.Threading.Tasks;

namespace OrionOperatorLifecycleWebApp.Services
{
    public interface IAutoAdvanceService
    {
        Task CheckAndAdvanceOperatorAsync(string operatorId);
    }
}
