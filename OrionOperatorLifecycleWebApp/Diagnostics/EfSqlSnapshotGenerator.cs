using System;
using System.IO;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using OrionOperatorLifecycleWebApp.Repositories.Sql;

namespace OrionOperatorLifecycleWebApp.Diagnostics
{
    public static class EfSqlSnapshotGenerator
    {
        public static void Generate(IServiceProvider services, string contentRootPath)
        {
            try
            {
                // Determine solution root (parent of web app project folder)
                var solutionRoot = Directory.GetParent(contentRootPath)?.FullName ?? contentRootPath;
                var targetDir = Path.Combine(solutionRoot, "SQL_Query");
                Directory.CreateDirectory(targetDir);

                using var scope = services.CreateScope();
                var ctx = scope.ServiceProvider.GetService(typeof(OrionDbContext)) as OrionDbContext;
                if (ctx == null)
                {
                    return;
                }

                // Operators
                var operatorsQuery = ctx.Operators
                    .AsNoTracking()
                    .Where(o => o.IsDeleted != true);
                WriteSql(Path.Combine(targetDir, "Operators.sql"), operatorsQuery.ToQueryString());

                // StatusTypes
                var statusTypesQuery = ctx.StatusTypes
                    .AsNoTracking()
                    .Where(st => st.IsDeleted != true);
                WriteSql(Path.Combine(targetDir, "StatusTypes.sql"), statusTypesQuery.ToQueryString());

                // PizzaStatuses
                var pizzaStatusesQuery = ctx.PizzaStatuses
                    .AsNoTracking();
                WriteSql(Path.Combine(targetDir, "PizzaStatuses.sql"), pizzaStatusesQuery.ToQueryString());

                // CertTypes
                var certTypesQuery = ctx.CertTypes
                    .AsNoTracking()
                    .Where(ct => ct.IsDeleted != true);
                WriteSql(Path.Combine(targetDir, "CertTypes.sql"), certTypesQuery.ToQueryString());

                // Certifications
                var certificationsQuery = ctx.Certifications
                    .AsNoTracking()
                    .Where(c => c.IsDeleted != true);
                WriteSql(Path.Combine(targetDir, "Certifications.sql"), certificationsQuery.ToQueryString());

                // Clients
                var clientsQuery = ctx.Clients
                    .AsNoTracking();
                WriteSql(Path.Combine(targetDir, "Clients.sql"), clientsQuery.ToQueryString());
            }
            catch
            {
                // Best-effort helper for development; swallow any errors.
            }
        }

        private static void WriteSql(string path, string sql)
        {
            if (string.IsNullOrWhiteSpace(sql)) return;
            File.WriteAllText(path, sql);
        }
    }
}
