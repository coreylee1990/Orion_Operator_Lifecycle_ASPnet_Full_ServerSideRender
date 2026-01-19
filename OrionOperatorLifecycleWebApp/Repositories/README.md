# Repositories (JSON File-Based)

This folder contains the **JSON file-based repository implementations** for the Orion Operator Lifecycle application.

## Purpose
These repositories read and write data to JSON files stored in the `App_Data/` folder. This provides a lightweight, file-based persistence layer ideal for development and testing.

## Contents
- **OperatorRepository.cs** - Manages operator data from `pay_Operators.json`
- **CertificationRepository.cs** - Manages certifications from `pay_Certifications.json`
- **StatusTypeRepository.cs** - Manages status types from `pay_StatusTypes.json`
- **CertTypeRepository.cs** - Manages certification types from `pay_CertTypes.json`
- **PizzaStatusRepository.cs** - Manages pizza statuses from `pay_PizzaStatuses.json`
- **RequirementRepository.cs** - Manages requirements from various JSON files

## Interfaces
Each repository implements an interface (e.g., `IOperatorRepository`) defined in this same folder. This allows the application to switch between JSON and SQL implementations via dependency injection.

## Data Storage
- **Location**: `App_Data/` folder
- **Format**: JSON files with `.json` extension
- **Serialization**: Uses `System.Text.Json` with custom converters (e.g., `FlexibleDateTimeConverter`)

## When This Is Used
These repositories are active when `UseSqlDatabase` is set to `false` in `appsettings.Development.json`.

## Features
- **Simple CRUD operations**: GetAll(), GetById(), Save(), etc.
- **In-memory loading**: Entire JSON file is loaded into memory for each operation
- **Custom JSON mapping**: Uses `[JsonPropertyName]` attributes to handle field name differences
- **Operator status updates**: Includes `UpdateStatus()` and `BulkUpdateOperatorStatus()` for workflow management
- **SaveAll methods**: Support batch updates for status types and cert types

## Related
- Service layer: See `Services/` folder
- Data models: See `Models/` folder
