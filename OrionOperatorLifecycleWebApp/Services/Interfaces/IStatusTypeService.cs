using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;

namespace OrionOperatorLifecycleWebApp.Services
{
    public interface IStatusTypeService
    {
        List<StatusType> GetAllStatusTypes();
        StatusType GetStatusTypeById(string id);
        List<StatusType> GetStatusTypesByDivision(string divisionId);
        void SaveAllStatusTypes(List<StatusType> statusTypes);
        void AddStatusType(StatusType statusType);
    }
}
