# Auto-Advance Service Documentation

## Overview

The `AutoAdvanceService` is a business logic component designed to automatically progress an Operator through their lifecycle workflow. When an operator's current status is flagged as "Auto-Advance" (`IsAuto = true`), the service checks if the operator has completed all required certifications for that status/division. If requirements are met, the operator is automatically moved to the next status in the sequence.

## Key Components

### 1. Models
*   **`PizzaStatus`**: Represents the underlying configuration of a status.
    *   **Property**: `bool IsAuto` - A flag indicating if this status allows automatic advancement.
*   **`StatusType`**: Represents a specific instance of a status within a division's workflow order.
    *   **Property**: `OrderId` - Used to determine the sequence (Current -> Next).
*   **`Requirement`**: Maps a `PizzaStatus` and `Division` to a list of required `Certification` types.
*   **`Operator`**: The user entity being processed.

### 2. Service Interface (`IAutoAdvanceService`)
```csharp
public interface IAutoAdvanceService
{
    Task CheckAndAdvanceOperatorAsync(string operatorId);
}
```

### 3. Logic Flow
1.  **Retrieve Operator**: Validates the operator exists.
2.  **Identify Current Status**: Looks up the `StatusType` and underlying `PizzaStatus`.
3.  **Check Auto-Advance Flag**: If `PizzaStatus.IsAuto` is false, execution stops.
4.  **Verify Requirements**: 
    *   Fetches requirements for the specific Status + Division.
    *   Compares the Operator's approved certifications against the requirements.
5.  **Advance**: 
    *   Calculates `NextOrder = CurrentOrder + 1`.
    *   Finds the `StatusType` with that Order ID for the same Division.
    *   Updates the Operator's `StatusId`, `StatusName`, and `OrderId`.

---

## Integration Guide: Main SQL Server MVC Project

Since the main Orion project uses SQL Server instead of JSON files, follow these steps to integrate the Auto-Advance logic.

### Step 1: Model Migration
Ensure your Entity Framework (or Dapper) models include the necessary properties.

*   **PizzaStatus Table**: Add an `IsAuto` (BIT/Boolean) column.
*   **Certifications Table**: Ensure columns map to the service logic (e.g., `IsApproved`, `IsDeleted`).

### Step 2: Data Access Adaptation
The current `AutoAdvanceService` injects specific JSON repositories (`OperatorRepository`, `PizzaStatusRepository`, etc.). You will need to adapting the service to use your existing Data Layer.

**Option A: Using Entity Framework Core (Recommended)**
Inject your `DbContext` directly into `AutoAdvanceService` instead of the JSON repositories.

```csharp
public class AutoAdvanceService : IAutoAdvanceService
{
    private readonly AppDbContext _context;

    public AutoAdvanceService(AppDbContext context)
    {
        _context = context;
    }

    public async Task CheckAndAdvanceOperatorAsync(string operatorId)
    {
        // 1. Get Operator
        var op = await _context.Operators
            .Include(o => o.Certifications)
            .FirstOrDefaultAsync(o => o.Id == operatorId);
            
        // 2. Get Status Logic (SQL Adaptation)
        var statusType = await _context.StatusTypes.FindAsync(op.StatusId);
        var pizzaStatus = await _context.PizzaStatuses
            .FirstOrDefaultAsync(ps => ps.Status == statusType.Status);

        if (pizzaStatus == null || !pizzaStatus.IsAuto) return;

        // 3. Check Requirements
        // Adapt query to check join table or requirements table
        var requiredCertTypeIds = await _context.Requirements
            .Where(r => r.PizzaStatusId == pizzaStatus.Id && r.DivisionId == op.DivisionId)
            .SelectMany(r => r.RequiredCertifications)
            .Select(rc => rc.CertTypeId)
            .ToListAsync();
            
        // 4. Validate
        bool allMet = requiredCertTypeIds.All(reqId => 
            op.Certifications.Any(c => c.CertTypeId == reqId && c.IsApproved));

        if (allMet) 
        {
           // 5. Find Next Status
           int currentOrder = int.Parse(statusType.OrderId);
           var nextStatus = await _context.StatusTypes
               .FirstOrDefaultAsync(s => s.DivisionId == op.DivisionId && s.OrderId == (currentOrder + 1).ToString());
               
           if (nextStatus != null)
           {
               op.StatusId = nextStatus.Id;
               op.StatusName = nextStatus.Status;
               op.OrderId = nextStatus.OrderId;
               await _context.SaveChangesAsync();
           }
        }
    }
}
```

### Step 3: Dependency Injection
Register the service in your main project's `Program.cs` or `Startup.cs`:

```csharp
builder.Services.AddScoped<IAutoAdvanceService, AutoAdvanceService>();
```

### Step 4: Triggering the Service
Call the service whenever an event occurs that might satisfy requirements (e.g., a Certification is approved/uploaded).

```csharp
[HttpPost]
public async Task<IActionResult> ApproveCert(string certId)
{
    // ... logic to approve cert ...
    
    // Trigger Auto-Advance Check
    await _autoAdvanceService.CheckAndAdvanceOperatorAsync(operatorId);
    
    return Ok();
}
```
