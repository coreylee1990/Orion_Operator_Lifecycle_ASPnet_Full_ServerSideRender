//dotnet run --project OrionOperatorLifecycleWebApp/OrionOperatorLifecycleWebApp.csproj
using OrionOperatorLifecycleWebApp.Repositories;
using OrionOperatorLifecycleWebApp.Services;

var builder = WebApplication.CreateBuilder(args);


// Add services to the container.
builder.Services.AddControllersWithViews();

// Register repositories
builder.Services.AddSingleton<OperatorRepository>();
builder.Services.AddSingleton<CertificationRepository>();
builder.Services.AddSingleton<PizzaStatusRepository>();
builder.Services.AddSingleton<StatusTypeRepository>();
builder.Services.AddSingleton<RequirementRepository>();

// Register services
builder.Services.AddScoped<IOperatorService, OperatorService>();
builder.Services.AddScoped<ICertificationService, CertificationService>();
builder.Services.AddScoped<IPizzaStatusService, PizzaStatusService>();
builder.Services.AddScoped<IStatusTypeService, StatusTypeService>();
builder.Services.AddScoped<IRequirementService, RequirementService>();
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
