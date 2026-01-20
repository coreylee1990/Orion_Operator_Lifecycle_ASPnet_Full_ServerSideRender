using System.Collections.Generic;
using OrionOperatorLifecycleWebApp.Models;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public interface IOperatorRepository
    {
        List<Operator> GetAll();
        Operator GetById(string id);
        List<Operator> GetByDivision(string divisionId);
        void Save(Operator op);
        void UpdateStatus(string operatorId, string newStatusName, string newStatusId, string newOrderId);
    }
}
