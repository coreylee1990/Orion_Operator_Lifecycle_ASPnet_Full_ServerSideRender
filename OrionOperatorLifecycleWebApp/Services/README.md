# Services (Business Logic Layer)

This folder contains the **service layer** that provides a unified interface for business operations, abstracting away the underlying data storage mechanism.

## Purpose
Services act as an intermediary between controllers and repositories. They:
- Encapsulate business logic
- Provide a consistent API regardless of whether data comes from JSON files or SQL database
- Enable easy switching between data sources via dependency injection

## Architecture Pattern
```
Controllers → Services → Repositories (JSON or SQL) → Data Storage
```

## Contents
- **OperatorService.cs** / **IOperatorService.cs** - Operator business logic
- **CertificationService.cs** / **ICertificationService.cs** - Certification management
- **StatusTypeService.cs** / **IStatusTypeService.cs** - Status type operations
- **CertTypeService.cs** / **ICertTypeService.cs** - Certification type management
- **PizzaStatusService.cs** / **IPizzaStatusService.cs** - Pizza status operations
- **RequirementService.cs** / **IRequirementService.cs** - Requirement management
- **AutoAdvanceService.cs** / **IAutoAdvanceService.cs** - Workflow automation logic

## How It Works
Each service:
1. Receives a repository via dependency injection (constructor)
2. The repository can be either JSON-based or SQL-based
3. Service methods delegate to repository methods
4. Additional business logic is applied as needed

## Mode Switching
The application automatically injects the correct repository implementation based on the `UseSqlDatabase` configuration in `appsettings.Development.json`:
- `false` → JSON repositories from `Repositories/` folder
- `true` → SQL repositories from `localhostuseONLY/` folder

## Key Features
- **Mode-agnostic**: Services don't know or care whether data comes from JSON or SQL
- **Bulk operations**: Support for bulk status updates (e.g., `BulkUpdateOperatorStatus`)
- **Workflow logic**: Status progression, requirement checking, auto-advance
- **SaveAll methods**: Batch saving for status types and cert types
- **Consistency**: Same API surface regardless of data source

## Example Usage
```csharp
public class DataController : ControllerBase
{
    private readonly IOperatorService _operatorService;
    
    public DataController(IOperatorService operatorService)
    {
        _operatorService = operatorService; // Injected automatically
    }
    
    [HttpGet("operators")]
    public IActionResult GetOperators()
    {
        var operators = _operatorService.GetAllOperators();
        return Ok(operators);
    }
}
```

## Related
- JSON repositories: See `Repositories/` folder
- SQL repositories: See `localhostuseONLY/` folder
- Dependency injection: See `Program.cs`
- Data models: See `Models/` folder
