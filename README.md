# Orion Operator Lifecycle WebApp

## Overview
This application manages the lifecycle of operators, including certification tracking, status management, and compliance enforcement.

## Features
*   **Requirements Editor**: Manage certification requirements per Status and Division.
*   **Operator Profile**: View and edit operator details and certifications.
*   **Auto-Advance Service**: Automatically promotes operators to the next status when requirements are met.

## Auto-Advance Feature
The system includes an `AutoAdvanceService` that streamlines the workflow. 
*   **Configuration**: The `PizzaStatus` model includes an `IsAuto` property.
*   **Logic**: If an operator is in an `IsAuto` status and meets all certification requirements, they are automatically advanced to the next workflow step.
*   **Documentation**: Detailed integration instructions for SQL Server environments can be found in [Docs/AutoAdvanceService.md](Docs/AutoAdvanceService.md).

## Getting Started
1.  Run `dotnet run --project OrionOperatorLifecycleWebApp`
2.  Navigate to `http://localhost:5000`
