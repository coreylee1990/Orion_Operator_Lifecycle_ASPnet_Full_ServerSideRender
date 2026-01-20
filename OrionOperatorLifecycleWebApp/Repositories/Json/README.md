# JSON Repositories

This folder contains JSON-backed repository implementations used when the application is running against sample data instead of SQL.

- Data source: files under `App_Data` (e.g., `pay_Operators.json`, `pay_Certifications.json`, `pay_PizzaStatuses.json`, `pay_PizzaStatusRequirements.json`, `pay_StatusTypes.json`, `pay_Clients.json`, `pay_StatusTracker.json`).
- Activation: controlled by the `UseSqlDatabase` setting in configuration. When `UseSqlDatabase` is `false`, these repositories are used by services instead of the SQL/EF repositories under `Repositories/Sql`.
- Origin of JSON: the Python utilities under the `Python` folder export data from the main Orion database into the JSON files consumed here.

These implementations share the same namespaces and interfaces as their SQL counterparts so that higher layers (services, controllers) remain agnostic to the underlying storage.
