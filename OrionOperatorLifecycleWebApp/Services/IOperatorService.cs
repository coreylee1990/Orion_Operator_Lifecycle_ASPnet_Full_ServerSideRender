using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;

namespace OrionOperatorLifecycleWebApp.Services
{
    public interface IOperatorService
    {
        List<Operator> GetAllOperators();
        Operator GetOperatorById(string id);
        List<Operator> GetOperatorsByDivision(string divisionId);
        void UpdateOperatorStatus(string operatorId, string newStatusName, string newStatusId, string newOrderId);
        void BulkUpdateOperatorStatus(List<string> operatorIds, string newStatusName, string newStatusId, string newOrderId);
    }
}