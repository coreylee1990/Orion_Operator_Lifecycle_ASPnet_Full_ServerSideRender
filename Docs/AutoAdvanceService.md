# Auto-Advance Service

## Overview

The `AutoAdvanceService` is a business logic component that automatically progresses an operator through their lifecycle workflow when they satisfy all requirements for an auto-advance status. It is designed to be:

- **Event-driven** in the main Orion app (per-operator, on cert approval/revocation).
- **Bulk-capable** in this Requirements editor (division-wide recalcs for admin scenarios).

When an operator's current status is backed by a `PizzaStatus` with `IsAuto = true`, the service checks that operator's certifications against the requirements for that status/division. If all requirements are met, the operator is moved to the next valid status in the workflow.

## Core Models

- `PizzaStatus`
  - Configuration of a status in the workflow.
  - Key: `IsAuto` (bool) — whether this status is eligible for automatic advancement.
- `StatusType`
  - A concrete status step within a division's ordered workflow.
  - Keys: `OrderId` (sequence), `PizzaStatusId` (link to `PizzaStatus`).
- `Requirement`
  - Maps a `PizzaStatusId` + `Division` to a list of required certification type IDs.
- `Operator`
  - The person being advanced; carries `Status`, `StatusId`, `DivisionId` and certifications.

## Service Contract

```csharp
public interface IAutoAdvanceService
{
    /// Re-evaluates a single operator for auto-advance and, if eligible,
    /// moves them to the next status and returns a summary of the change.
    Task<AutoAdvanceResult?> AdvanceOperatorIfEligibleAsync(
        string operatorId,
        string? reason = null,
        CancellationToken cancellationToken = default);

    /// Bulk recalculation used by admin tools / this Requirements app.
    /// Scans a division (optionally scoped by client) and auto-advances
    /// all eligible operators, returning a summary.
    Task<IReadOnlyList<AutoAdvanceResult>> RecalculateAndAdvanceDivisionAsync(
        string clientId,
        string divisionId,
        CancellationToken cancellationToken = default);

    /// Computes the next status for an operator using the same
    /// ordering and PizzaStatusId rules as the Requirements editor UI,
    /// without mutating state.
    Task<StatusType?> GetNextStatusForOperatorAsync(string operatorId);
}

public sealed class AutoAdvanceResult
{
    public string OperatorId { get; init; } = string.Empty;
    public string? FromStatusId { get; init; }
    public string? ToStatusId { get; init; }
    public bool Changed { get; init; }
    public string? Reason { get; init; }
}
```

## Logic Flow (Per Operator)

`AdvanceOperatorIfEligibleAsync` performs the following steps:

1. **Load operator**
   - Fetches the operator by ID from the configured repository (JSON or SQL).
2. **Resolve current status**
   - Attempts to load `StatusType` via `StatusId`.
   - Falls back to finding a `StatusType` in the operator's division whose `Status` text matches the operator's `Status`.
3. **Check auto-advance flag**
   - Looks up the backing `PizzaStatus` by `StatusType.Status`.
   - If `IsAuto` is false or the `PizzaStatus` is missing, no change is made.
4. **Evaluate requirements**
   - Loads the `Requirement` for `PizzaStatusId + Division`.
   - Loads only that operator's approved, non-deleted certifications.
   - Builds a set of held `CertTypeId` values.
   - Ensures every required certification ID is present.
5. **Select next status**
   - Loads all `StatusType` rows for the operator's division.
   - Finds the next status with:
     - `OrderId` greater than the current step's order.
     - A different `PizzaStatusId` (to avoid looping on the same base status).
   - Chooses the lowest `OrderId` that satisfies these rules.
6. **Persist + return result**
   - Calls the repository's `UpdateStatus` to update the operator.
   - Returns an `AutoAdvanceResult` that records old/new status IDs and a reason string.

## Usage in the Orion App (Event-Driven)

In the main Orion Web API/MVC project, the recommended pattern is to call the service when a certification changes for a specific operator:

```csharp
// Inside a controller in the Orion app
[HttpPost]
public async Task<IActionResult> ApproveCertification(string certId, string operatorId)
{
    // 1. Approve the certification in the main Orion DB.
    //    (Existing Orion logic updates the Certification row.)

    // 2. Trigger auto-advance for that single operator.
    var result = await _autoAdvanceService.AdvanceOperatorIfEligibleAsync(
        operatorId,
        reason: $"CertApproved:{certId}");

    // 3. Optionally log or return result for auditing/diagnostics.
    return Ok(result);
}
```

This keeps day-to-day auto-advance work small and cheap: only the affected operator and their certifications are queried.

## Usage in this Requirements Editor (Bulk)

For admin scenarios (like this standalone Requirements editor) where you want to rescan a whole division:

```csharp
// Example: admin-triggered bulk recalc for a division
var results = await _autoAdvanceService.RecalculateAndAdvanceDivisionAsync(
    clientId: someClientId,
    divisionId: someDivisionId,
    cancellationToken: cancellationToken);

// Results can be summarized into the auto-advance modal or logs.
```

Under the hood, the bulk method:

- Loads operators (all or per division).
- Calls the same internal decision logic used by `AdvanceOperatorIfEligibleAsync` for each operator.
- Returns a collection of `AutoAdvanceResult` entries so the caller can show or log what changed.

## Storage-Agnostic Design

The service uses repository interfaces (`IOperatorRepository`, `ICertificationRepository`, `IRequirementRepository`, `IPizzaStatusRepository`, `IStatusTypeRepository`) so it can run in both modes:

- **JSON/sample data mode** (this project, `UseSqlDatabase = false`)
  - Repositories under `Repositories/Json` read/write JSON files in `App_Data`.
- **SQL/production mode** (integrated Orion environment, `UseSqlDatabase = true`)
  - Repositories under `Repositories/Sql` use `OrionDbContext` (EF Core) against SQL Server.

Controllers and API layers simply depend on `IAutoAdvanceService` and remain unaware of the underlying storage.
