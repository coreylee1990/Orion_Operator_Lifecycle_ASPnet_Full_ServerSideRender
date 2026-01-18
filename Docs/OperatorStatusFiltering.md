# Operator Status Filtering Logic

## Important SQL Query Reference

This query shows how to identify **Operator-only** statuses by joining `pay_StatusTypes` with `pay_PizzaStatus`:

```sql
SELECT DISTINCT 
    ps.Status, 
    ps.IsOperator, 
    ps.IsProvider 
FROM pay_PizzaStatus ps 
ORDER BY ps.Status
```

## Status Classification

| IsOperator | IsProvider | Classification |
|------------|------------|----------------|
| 1 (true)   | NULL       | **Operator Status** ✅ |
| NULL       | 1 (true)   | Provider Status ❌ |
| NULL       | NULL       | Event/Accident Status ❌ |

## Filtering Rules for Operator-Only Statuses

To show **only Operator statuses**, apply these filters:

### On `pay_StatusTypes` table:
- `Fleet = 0` (not a Fleet status)
- `Providers = 0` (not a Provider status)
- `isDeleted = 0` or `NULL` (not deleted)
- `PizzaStatusID IS NOT NULL` (must be linked to a PizzaStatus)

### On `pay_PizzaStatus` table (via join):
- `IsOperator = 1` (must be explicitly marked as Operator)

## Full Query Example

```sql
SELECT 
    st.Status,
    st.DivisionID,
    st.OrderID,
    st.Fleet,
    st.Providers,
    st.isDeleted,
    ps.Status AS PizzaStatus,
    ps.IsOperator,
    ps.IsProvider
FROM pay_StatusTypes st
INNER JOIN pay_PizzaStatus ps ON st.PizzaStatusID = ps.ID
WHERE 
    (st.isDeleted = 0 OR st.isDeleted IS NULL)
    AND (st.Fleet = 0 OR st.Fleet IS NULL)
    AND (st.Providers = 0 OR st.Providers IS NULL)
    AND ps.IsOperator = 1
ORDER BY st.OrderID
```

## JavaScript Implementation

In `requirements-editor.js`, the `initializeDynamicWorkflow()` function filters statuses:

```javascript
// CRITICAL: PizzaStatus MUST have IsOperator = 1/true to be an Operator status
const ps = pizzaStatusMap[stPizzaStatusId];
const psIsOperator = ps.IsOperator ?? ps.isOperator;
// Require IsOperator to be explicitly true/1
if (psIsOperator !== true && psIsOperator !== 1) return false;
```

## Notes

- The `pay_PizzaStatus` table defines workflow stages (e.g., "Onboarding", "Credentialing")
- The `pay_StatusTypes` table contains division-specific status instances
- Each StatusType links to a PizzaStatus via `PizzaStatusID`
- Operator workflows are distinct from Provider and Fleet workflows
- Event/Accident statuses (IsOperator=NULL, IsProvider=NULL) are excluded from Operator view

---
*Last Updated: January 18, 2026*
