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
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<List<Operator>>(json, options) ?? new List<Operator>();
        }

        public Operator GetById(string id) => GetAll().FirstOrDefault(o => o.Id == id);

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
    }
}