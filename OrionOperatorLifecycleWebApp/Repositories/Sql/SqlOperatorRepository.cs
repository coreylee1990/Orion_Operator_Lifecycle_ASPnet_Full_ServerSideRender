using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using OrionOperatorLifecycleWebApp.Models;
using OrionOperatorLifecycleWebApp.Repositories;

namespace OrionOperatorLifecycleWebApp.Repositories.Sql
{
    public class SqlOperatorRepository : IOperatorRepository
    {
        private readonly OrionDbContext _context;

        public SqlOperatorRepository(OrionDbContext context)
        {
            _context = context;
        }

        public List<Operator> GetAll()
        {
            var query = from o in _context.Operators.AsNoTracking().Where(op => op.IsDeleted != true)
                        join s in _context.StatusTypes.AsNoTracking() on o.StatusId equals s.Id into joinS
                        from s in joinS.DefaultIfEmpty()
                        select new { o, s };

            var operators = query.ToList().Select(x =>
            {
                x.o.StatusName = x.s?.Status;
                x.o.OrderId = x.s?.OrderId;
                return x.o;
            }).ToList();
            
            // Load certifications for all operators
            var operatorIds = operators.Select(o => o.Id).ToList();
            var certifications = _context.Certifications.AsNoTracking()
                .Where(c => operatorIds.Contains(c.OperatorId))
                .ToList();
            
            // Group certifications by operator
            var certsByOperator = certifications.GroupBy(c => c.OperatorId).ToDictionary(g => g.Key, g => g.ToList());
            
            foreach (var op in operators)
            {
                op.Certifications = certsByOperator.ContainsKey(op.Id) 
                    ? certsByOperator[op.Id] 
                    : new List<Certification>();
            }
            
            return operators;
        }

        public Operator GetById(string id)
        {
            var query = from o in _context.Operators.Where(op => op.Id == id && op.IsDeleted != true)
                        join s in _context.StatusTypes on o.StatusId equals s.Id into joinS
                        from s in joinS.DefaultIfEmpty()
                        select new { o, s };
            
            var result = query.FirstOrDefault();
            if (result == null) return null;
            
            result.o.StatusName = result.s?.Status;
            result.o.OrderId = result.s?.OrderId;
            
            // Load certifications for this operator
            result.o.Certifications = _context.Certifications.AsNoTracking()
                .Where(c => c.OperatorId == id)
                .ToList();
            
            return result.o;
        }

        public List<Operator> GetByDivision(string divisionId)
        {
            var query = from o in _context.Operators.AsNoTracking().Where(op => op.DivisionId == divisionId && op.IsDeleted != true)
                        join s in _context.StatusTypes.AsNoTracking() on o.StatusId equals s.Id into joinS
                        from s in joinS.DefaultIfEmpty()
                        select new { o, s };

            var operators = query.ToList().Select(x =>
            {
                x.o.StatusName = x.s?.Status;
                x.o.OrderId = x.s?.OrderId;
                return x.o;
            }).ToList();
            
            // Load certifications for these operators only
            var operatorIds = operators.Select(o => o.Id).ToList();
            var certifications = _context.Certifications.AsNoTracking()
                .Where(c => operatorIds.Contains(c.OperatorId))
                .ToList();
            
            var certsByOperator = certifications.GroupBy(c => c.OperatorId).ToDictionary(g => g.Key, g => g.ToList());
            
            foreach (var op in operators)
            {
                op.Certifications = certsByOperator.ContainsKey(op.Id) 
                    ? certsByOperator[op.Id] 
                    : new List<Certification>();
            }
            
            return operators;
        }

        public void Save(Operator op)
        {
            var existing = _context.Operators.Find(op.Id);
            if (existing != null)
            {
                _context.Entry(existing).CurrentValues.SetValues(op);
            }
            else
            {
                _context.Operators.Add(op);
            }
            _context.SaveChanges();
        }

        public void UpdateStatus(string operatorId, string newStatusName, string newStatusId, string newOrderId)
        {
            var op = _context.Operators.Find(operatorId);
            if (op != null)
            {
                op.StatusId = newStatusId;
                // StatusName and OrderId are computed from join in GetAll, but we update StatusId
                _context.SaveChanges();
            }
        }
    }
}
