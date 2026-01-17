# Models (Data Transfer Objects)

This folder contains the **data models** used throughout the Orion Operator Lifecycle application.

## Purpose
Models define the structure of data entities and serve as:
- Data transfer objects (DTOs) between layers
- Entity Framework Core entities (for SQL mode)
- JSON deserialization targets (for file-based mode)

## Contents
- **Operator.cs** - Represents an operator with status, division, and personal info
- **Certification.cs** - Represents an operator's certification record
- **StatusType.cs** - Represents a workflow status in a division
- **CertType.cs** - Represents a certification type requirement
- **PizzaStatus.cs** - Represents a global status definition
- **Requirement.cs** - Represents certification requirements for statuses
- **FlexibleDateTimeConverter.cs** - Custom JSON converter for datetime parsing

## Key Features

### Dual-Mode Compatibility
Models work seamlessly with both:
- **JSON files** (via `System.Text.Json`)
- **SQL database** (via Entity Framework Core)

### JSON Property Mapping
Uses `[JsonPropertyName]` attributes to handle naming conventions:
```csharp
[JsonPropertyName("ID")]  // JSON uses "ID"
public string Id { get; set; }  // C# uses "Id"

[JsonPropertyName("DivisionID")]  // JSON uses "DivisionID"
public string DivisionId { get; set; }  // C# uses "DivisionId"
```

### Custom DateTime Handling
The `FlexibleDateTimeConverter` handles multiple datetime formats:
- SQL Server format: `"2024-11-25 22:30:58.830"`
- ISO 8601: `"2024-11-25T22:30:58.830Z"`
- Date only: `"2024-11-25"`

Applied to `Certification.Date` property:
```csharp
[JsonConverter(typeof(FlexibleDateTimeConverter))]
public DateTime? Date { get; set; }
```

## Entity Relationships

### Operator
- Has many **Certifications**
- Belongs to a **StatusType** (via StatusId)
- Belongs to a **Division** (via DivisionId)

### Certification
- Belongs to an **Operator** (via OperatorId)
- Belongs to a **CertType** (via CertTypeId)
- Has an expiration **Date**

### StatusType
- Represents a step in a workflow
- Has an **OrderID** for sequencing
- Belongs to a **Division**
- Can be marked as deleted (**isDeleted**)

### CertType
- Defines a certification requirement
- Can be linked to a **PizzaStatus** (via PizzaStatusID)
- Belongs to a **Division**

## Shared Across Modes
These models are used by:
- ✅ JSON repositories in `Repositories/`
- ✅ SQL repositories in `localhostuseONLY/`
- ✅ Services in `Services/`
- ✅ Controllers in `Controllers/`
- ✅ Views/JavaScript in frontend

## Configuration
JSON serialization options are configured in `Program.cs`:
```csharp
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
        options.JsonSerializerOptions.Converters.Add(new FlexibleDateTimeConverter());
    });
```

## Related
- JSON storage: See `App_Data/` folder
- SQL context: See `localhostuseONLY/OrionDbContext.cs`
- Repositories: See `Repositories/` and `localhostuseONLY/` folders
