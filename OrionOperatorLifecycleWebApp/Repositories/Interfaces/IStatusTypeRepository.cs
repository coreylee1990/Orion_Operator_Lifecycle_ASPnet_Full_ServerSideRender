using System.Collections.Generic;
using OrionOperatorLifecycleWebApp.Models;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public interface IStatusTypeRepository
    {
        List<StatusType> GetAll();
        StatusType GetById(string id);
        List<StatusType> GetByDivision(string divisionId);
        void SaveAll(List<StatusType> statusTypes);
    }
}
