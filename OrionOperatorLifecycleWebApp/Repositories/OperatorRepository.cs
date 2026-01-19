using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Linq;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public class OperatorRepository : IOperatorRepository
    {
        private readonly string _filePath = "App_Data/pay_Operators.json";

        public List<Operator> GetAll()
        {
            if (!File.Exists(_filePath)) return new List<Operator>();
            var json = File.ReadAllText(_filePath);
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var allOperators = JsonSerializer.Deserialize<List<Operator>>(json, options) ?? new List<Operator>();
            
            // Map Status to StatusName if StatusName is null (for SQL-exported JSON)
            foreach (var op in allOperators)
            {
                if (string.IsNullOrEmpty(op.StatusName) && !string.IsNullOrEmpty(op.Status))
                {
                    op.StatusName = op.Status;
                }
            }
            
            return allOperators.Where(o => o.IsDeleted != true).ToList();
        }

        public Operator GetById(string id) => GetAll().FirstOrDefault(o => o.Id == id && o.IsDeleted != true);

        public List<Operator> GetByDivision(string divisionId) => GetAll().Where(o => o.DivisionId == divisionId).ToList();

        public void Save(Operator op)
        {
            var list = GetAll();
            var index = list.FindIndex(o => o.Id == op.Id);
            if (index != -1)
            {
                list[index] = op;
                var json = JsonSerializer.Serialize(list, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(_filePath, json);
            }
        }

        public void UpdateStatus(string operatorId, string newStatusName, string newStatusId, string newOrderId)
        {
            var list = GetAll();
            var op = list.FirstOrDefault(o => o.Id == operatorId);
            if (op != null)
            {
                op.StatusName = newStatusName;
                op.StatusId = newStatusId;
                op.OrderId = newOrderId;
                var json = JsonSerializer.Serialize(list, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(_filePath, json);
            }
        }
    }
}