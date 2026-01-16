using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;

namespace OrionOperatorLifecycleWebApp.Services
{
    public interface IOperatorService
    {
        List<Operator> GetAllOperators();
        Operator GetOperatorById(string id);
        List<Operator> GetOperatorsByDivision(string divisionId);
    }
}