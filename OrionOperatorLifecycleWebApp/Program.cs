//dotnet run --project OrionOperatorLifecycleWebApp/OrionOperatorLifecycleWebApp.csproj
using OrionOperatorLifecycleWebApp.Repositories;
using OrionOperatorLifecycleWebApp.Services;
using OrionOperatorLifecycleWebApp.Repositories.Sql;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);


// Add services to the container.
builder.Services.AddControllersWithViews();

bool useSqlDatabase = builder.Configuration.GetValue<bool>("UseSqlDatabase");
Console.WriteLine($"\n\n---------------------------------------------------------");
Console.WriteLine($"[CONFIG] UseSqlDatabase: {useSqlDatabase}");
Console.WriteLine($"---------------------------------------------------------\n\n");

if (useSqlDatabase)
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    builder.Services.AddDbContext<OrionDbContext>(options =>
        options.UseSqlServer(connectionString));

    // Register SQL Repositories
    builder.Services.AddScoped<IOperatorRepository, SqlOperatorRepository>();
    builder.Services.AddScoped<ICertificationRepository, SqlCertificationRepository>();
    builder.Services.AddScoped<IPizzaStatusRepository, SqlPizzaStatusRepository>();
    builder.Services.AddScoped<IStatusTypeRepository, SqlStatusTypeRepository>();
    builder.Services.AddScoped<IRequirementRepository, SqlRequirementRepository>();
    builder.Services.AddScoped<ICertTypeRepository, SqlCertTypeRepository>();
}
else
{
    // Register JSON Repositories
    builder.Services.AddSingleton<IOperatorRepository, OperatorRepository>();
    builder.Services.AddSingleton<ICertificationRepository, CertificationRepository>();
    builder.Services.AddSingleton<IPizzaStatusRepository, PizzaStatusRepository>();
    builder.Services.AddSingleton<IStatusTypeRepository, StatusTypeRepository>();
    builder.Services.AddSingleton<IRequirementRepository, RequirementRepository>();
    builder.Services.AddSingleton<ICertTypeRepository>(provider => 
        new CertTypeRepository(builder.Environment.ContentRootPath));
}

// Register services
builder.Services.AddScoped<IOperatorService, OperatorService>();
builder.Services.AddScoped<ICertificationService, CertificationService>();
builder.Services.AddScoped<IPizzaStatusService, PizzaStatusService>();
builder.Services.AddScoped<IStatusTypeService, StatusTypeService>();
builder.Services.AddScoped<IRequirementService, RequirementService>();
builder.Services.AddScoped<ICertTypeService, CertTypeService>();
builder.Services.AddScoped<IAutoAdvanceService, AutoAdvanceService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
    app.UseHttpsRedirection();
}
// In development, skip HTTPS redirection to avoid port warnings
app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();


app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Requirements}/{action=Index}/{id?}")
    .WithStaticAssets();


app.Run();
