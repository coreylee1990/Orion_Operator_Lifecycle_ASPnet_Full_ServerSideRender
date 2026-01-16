using OrionOperatorLifecycleWebApp.Models;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace OrionOperatorLifecycleWebApp.Repositories
{
    public class OperatorRepository
    {
        private readonly string _filePath = "App_Data/pay_Operators.json";

        public List<Operator> GetAll()
        {
            if (!File.Exists(_filePath)) return new List<Operator>();
            var json = File.ReadAllText(_filePath);
            return JsonSerializer.Deserialize<List<Operator>>(json) ?? new List<Operator>();
        }

        public Operator GetById(string id) => GetAll().FirstOrDefault(o => o.Id == id);

        public List<Operator> GetByDivision(string divisionId) => GetAll().Where(o => o.DivisionId == divisionId).ToList();
    }
}