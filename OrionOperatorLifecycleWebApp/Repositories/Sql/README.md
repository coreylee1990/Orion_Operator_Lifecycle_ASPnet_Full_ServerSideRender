# SQL Database Infrastructure

This folder contains the **SQL Server database implementation** for the Orion Operator Lifecycle application.

## Purpose
These components provide Entity Framework Core-based data access to an Azure SQL Server database, serving as an alternative to the JSON file-based storage.

## Contents

### Database Context
- **OrionDbContext.cs** - Entity Framework Core DbContext defining database tables and relationships

### SQL Repository Implementations
- **SqlOperatorRepository.cs** - Database operations for operators
- **SqlCertificationRepository.cs** - Database operations for certifications
- **SqlStatusTypeRepository.cs** - Database operations for status types
- **SqlCertTypeRepository.cs** - Database operations for certification types
- **SqlPizzaStatusRepository.cs** - Database operations for pizza statuses
- **SqlRequirementRepository.cs** - Database operations for requirements

## Architecture

### Interface Implementation
Each SQL repository implements the same interface as its JSON counterpart:
- `SqlOperatorRepository` implements `IOperatorRepository`
- `SqlCertificationRepository` implements `ICertificationRepository`
- etc.

This allows seamless switching between data sources via dependency injection.

### Database Connection
Connection string is stored in `appsettings.Development.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=oriontcms.database.windows.net;Database=Orion_TCMS;..."
  }
}
```

## How It Works

### Mode Switching
The application uses the `UseSqlDatabase` configuration flag:
- `true` → Uses SQL repositories from this folder
- `false` → Uses JSON repositories from `Repositories/` folder

Configuration is done in `Program.cs`:
```csharp
if (useSqlDatabase)
{
    services.AddScoped<IOperatorRepository, SqlOperatorRepository>();
    // ... other SQL repositories
}
else
{
    services.AddScoped<IOperatorRepository, OperatorRepository>();
    // ... other JSON repositories
}
```

### Database Schema
The `OrionDbContext` defines these tables:
- **Operators** - Operator records
- **Certifications** - Certification records
- **StatusTypes** - Workflow status definitions
- **CertTypes** - Certification type requirements
- **PizzaStatuses** - Global status definitions
- **Requirements** - (if applicable)

### Key Features
- **LINQ queries**: Uses Entity Framework Core LINQ for data access
- **JOIN operations**: Automatically joins operators with status types to populate `StatusName`
- **SaveAll methods**: Batch update support with upsert logic (update if exists, insert if new)
- **UpdateStatus**: Operator status reassignment for workflow management
- **BulkUpdateOperatorStatus**: Move multiple operators to a different status atomically

## Connection Details
- **Server**: oriontcms.database.windows.net
- **Database**: Orion_TCMS
- **Provider**: Azure SQL Database
- **Authentication**: SQL Server authentication (connection string contains credentials)

## Important Notes

### Security
⚠️ **Never commit database credentials to source control**
- Connection strings should be in `appsettings.Development.json` (gitignored)
- Production: Use Azure Key Vault or managed identities

### Field Mapping
SQL column names may differ from JSON property names. Models use `[JsonPropertyName]` attributes to handle both:
```csharp
[JsonPropertyName("ID")]  // JSON: "ID"
public string Id { get; set; }  // SQL: "Id" column
```

### DateTime Handling
SQL Server datetime format differs from JSON ISO format. The `FlexibleDateTimeConverter` handles both automatically.

## Testing SQL Mode
1. Set `"UseSqlDatabase": true` in `appsettings.Development.json`
2. Ensure connection string is valid
3. Run the application
4. All operations will now use the SQL database instead of JSON files

## Integration Status
✅ **Complete** - Fully integrated with:
- All CRUD operations
- Operator status updates and reassignment
- Status deletion with operator impact checking
- Workflow management (add, remove, reorder statuses)
- Certification requirements

## Related
- JSON repositories: See `Repositories/` folder
- Service layer: See `Services/` folder
- Data models: See `Models/` folder
- Configuration: See `appsettings.Development.json` and `Program.cs`

