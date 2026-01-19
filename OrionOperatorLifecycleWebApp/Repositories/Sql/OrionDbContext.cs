using Microsoft.EntityFrameworkCore;
using OrionOperatorLifecycleWebApp.Models;

namespace OrionOperatorLifecycleWebApp.Repositories.Sql
{
    public class OrionDbContext : DbContext
    {
        public OrionDbContext(DbContextOptions<OrionDbContext> options)
            : base(options)
        {
        }

        public DbSet<Operator> Operators { get; set; }
        public DbSet<PizzaStatus> PizzaStatuses { get; set; }
        public DbSet<Certification> Certifications { get; set; }
        public DbSet<StatusType> StatusTypes { get; set; }
        public DbSet<CertType> CertTypes { get; set; }
        public DbSet<Client> Clients { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure primary keys if they don't follow convention
            modelBuilder.Entity<Operator>(entity =>
            {
                entity.ToTable("pay_Operators");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("ID").HasConversion(
                    v => Guid.Parse(v),
                    v => v.ToString().ToUpper()
                );
                entity.Property(e => e.DivisionId).HasColumnName("DivisionID").IsRequired(false);
                entity.Property(e => e.FirstName).IsRequired(false);
                entity.Property(e => e.LastName).IsRequired(false);
                
                entity.Property(e => e.StatusId).HasColumnName("StatusID").IsRequired(false).HasConversion(
                    v => v == null ? (Guid?)null : Guid.Parse(v),
                    v => v == null ? null : v.ToString().ToUpper()
                );
            });

            modelBuilder.Entity<Certification>(entity =>
            {
               entity.ToTable("pay_Certifications");
               entity.HasKey(e => e.CertificationId);
               entity.Property(e => e.CertificationId).HasColumnName("ID").HasConversion(
                    v => Guid.Parse(v),
                    v => v.ToString().ToUpper()
               );
               entity.Ignore(e => e.Division); // Division likely denormalized in JSON but normalized (via Operator) in SQL
               entity.Property(e => e.Cert).HasColumnName("Cert").IsRequired(false);
               entity.Property(e => e.IsDeleted).HasColumnName("IsDeleted").IsRequired(false);
               entity.Property(e => e.CertTypeId).HasColumnName("CertTypeID").IsRequired(false).HasConversion(
                    v => v == null ? (Guid?)null : Guid.Parse(v),
                    v => v == null ? null : v.ToString().ToUpper()
               );
               entity.Property(e => e.OperatorId).HasColumnName("OperatorID").IsRequired(false).HasConversion(
                    v => v == null ? (Guid?)null : Guid.Parse(v),
                    v => v == null ? null : v.ToString().ToUpper()
               );
               entity.Property(e => e.IsApproved).HasColumnName("isApproved").IsRequired(false);
               entity.Property(e => e.Date).HasColumnName("Date").IsRequired(false);
            });

            modelBuilder.Entity<PizzaStatus>(entity =>
            {
                 entity.ToTable("pay_PizzaStatus"); // Try singular table name
                 entity.HasKey(e => e.Id);
                 entity.Property(e => e.Id).HasColumnName("ID").HasConversion(
                    v => Guid.Parse(v),
                    v => v.ToString().ToUpper()
                 );
                 entity.Property(e => e.ClientId).HasColumnName("ClientID").IsRequired(false).HasConversion(
                    v => v == null ? (Guid?)null : Guid.Parse(v),
                    v => v == null ? null : v.ToString().ToUpper()
                 );
                 entity.Ignore(e => e.IsAuto); // Not present in legacy DB
                 entity.Property(e => e.IsOperator).HasColumnName("IsOperator").IsRequired(false);
                 entity.Property(e => e.IsProvider).HasColumnName("IsProvider").IsRequired(false);
            });

            modelBuilder.Entity<StatusType>(entity =>
            {
                 entity.ToTable("pay_StatusTypes");
                 entity.HasKey(e => e.Id);
                 entity.Property(e => e.Id).HasColumnName("Id").HasConversion(
                    v => Guid.Parse(v),
                    v => v.ToString().ToUpper()
                 );
                      entity.Property(e => e.Status).HasColumnName("Status").IsRequired(false);
                      entity.Property(e => e.Description).HasColumnName("Description").IsRequired(false);
                      entity.Property(e => e.OrderId).HasColumnName("OrderID").IsRequired(false);
                      entity.Property(e => e.DivisionId).HasColumnName("DivisionID").IsRequired(false);
                 entity.Property(e => e.PizzaStatusId).HasColumnName("PizzaStatusID").IsRequired(false).HasConversion(
                    v => v == null ? (Guid?)null : Guid.Parse(v),
                    v => v == null ? null : v.ToString().ToUpper()
                 );
                      entity.Property(e => e.AgeDaysAlert).HasColumnName("AgeDaysAlert").IsRequired(false);
                      entity.Property(e => e.RecordAt).HasColumnName("RecordAt").IsRequired(false);
                      entity.Property(e => e.RecordBy).HasColumnName("RecordBy").IsRequired(false);
                      entity.Property(e => e.UpdateAt).HasColumnName("UpdateAt").IsRequired(false);
                      entity.Property(e => e.UpdateBy).HasColumnName("UpdateBy").IsRequired(false);
                      entity.Property(e => e.VideoUrl).HasColumnName("VideoUrl").IsRequired(false);
                      entity.Property(e => e.NounId).HasColumnName("NounId").IsRequired(false).HasConversion(
                          v => v == null ? (Guid?)null : Guid.Parse(v),
                          v => v == null ? null : v.ToString().ToUpper()
                      );
                      entity.Property(e => e.SubNounId).HasColumnName("SubNounId").IsRequired(false).HasConversion(
                          v => v == null ? (Guid?)null : Guid.Parse(v),
                          v => v == null ? null : v.ToString().ToUpper()
                      );
                 entity.Property(e => e.IsDeleted).HasColumnName("isDeleted").IsRequired(false);
                 entity.Property(e => e.Fleet).HasColumnName("Fleet").IsRequired(false);
                 entity.Property(e => e.Providers).HasColumnName("Providers").IsRequired(false);
            });

            modelBuilder.Entity<CertType>(entity =>
            {
                entity.ToTable("pay_CertTypes");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("ID").HasConversion(
                    v => Guid.Parse(v),
                    v => v.ToString().ToUpper()
                );
                entity.Property(e => e.Certification).HasColumnName("Certification").IsRequired(false);
                entity.Property(e => e.Description).HasColumnName("Description").IsRequired(false);
                entity.Property(e => e.DivisionId).HasColumnName("DivisionID").IsRequired(false);
                entity.Property(e => e.PizzaStatusId).HasColumnName("PizzaStatusID").IsRequired(false).HasConversion(
                    v => v == null ? (Guid?)null : Guid.Parse(v),
                    v => v == null ? null : v.ToString().ToUpper()
                );
                 entity.Property(e => e.IsDeleted).HasColumnName("isDeleted").IsRequired(false);
            });

            modelBuilder.Entity<Client>(entity =>
            {
                entity.ToTable("pay_Clients");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("ID").HasConversion(
                    v => Guid.Parse(v),
                    v => v.ToString().ToUpper()
                );
                entity.Property(e => e.Description).HasColumnName("Description");
                entity.Property(e => e.Contact).HasColumnName("Contact");
                entity.Property(e => e.PhoneNumber).HasColumnName("PhoneNumber");
                entity.Property(e => e.City).HasColumnName("City");
                entity.Property(e => e.State).HasColumnName("State");
                entity.Property(e => e.ZipCode).HasColumnName("ZipCode");
            });
        }
    }
}
