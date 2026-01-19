# SQL Database to JSON Export Scripts

## Overview
Scripts to export data from the Orion SQL database to JSON files for the ASP.NET application.

## Scripts

### `export_database_to_json.py`
Exports SQL database tables to JSON files in `OrionOperatorLifecycleWebApp/App_Data/`.

**Key Features:**
- **Smart Operator Sampling**: Exports max 10 operators per division/status combination
- **Maintains Relationships**: Exports only certifications and status tracker records for sampled operators
- **Full Reference Tables**: Exports complete StatusTypes, PizzaStatuses, CertTypes, and Clients tables
- **Date Handling**: Converts SQL datetime to ISO format
- **GUID Support**: Handles SQL uniqueidentifier types

## Prerequisites

```bash
pip install pyodbc
```

**Note:** Requires ODBC Driver 17 for SQL Server to be installed on your system.

## Usage

### Export All Tables
```bash
cd Scripts
python export_database_to_json.py
```

### Customize Sampling
Edit the script to change the max operators per division/status:
```python
operator_ids = export_operators(conn, max_per_division_status=20)  # Change from 10 to 20
```

## Output Files

The script exports to `OrionOperatorLifecycleWebApp/App_Data/`:

| File | Description | Sampling Strategy |
|------|-------------|-------------------|
| `pay_Operators.json` | Operator records | Max 10 per division/status, prioritizes recent updates |
| `pay_Certifications.json` | Certifications | Only for sampled operators |
| `pay_StatusTracker.json` | Status history | Only for sampled operators |
| `pay_StatusTypes.json` | Status types | Full export (not deleted) |
| `pay_PizzaStatuses.json` | Pizza statuses | Full export |
| `pay_CertTypes.json` | Certification types | Full export (not deleted) |
| `pay_Clients.json` | Clients | Full export |

## Sampling Strategy

### Operators
For each unique **Division + Status** combination:
1. Query all operators in that combination
2. Sort by `UpdateAt DESC` (most recently updated first)
3. Take top 10 operators
4. Ensures diverse representation across all divisions and statuses

**Example Output:**
```
1 - LAHORE - ONBOARDING: Selected 10 of 245 operators
1 - LAHORE - CREDENTIALING: Selected 10 of 123 operators
2 - KARACHI - IN-PROCESS: Selected 8 of 8 operators
```

### Related Data
- **Certifications**: Only for sampled operator IDs
- **Status Tracker**: Only for sampled operator IDs

### Reference Tables
- Exported in full (no sampling)
- Excludes deleted records (`isDeleted = 0`)

## Connection Configuration

Default connection (from `appsettings.Development.json`):
```python
SERVER = 'oriontcms.database.windows.net'
DATABASE = 'Orion'
USERNAME = 'tcms_admin'
PASSWORD = 'Fouru2nvu9'
```

To use different credentials, edit the script or pass environment variables.

## Troubleshooting

### ODBC Driver Not Found
```bash
# Windows: Download and install ODBC Driver 17 for SQL Server
# https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server
```

### Connection Timeout
Increase timeout in connection string:
```python
CONNECTION_STRING = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER};DATABASE={DATABASE};UID={USERNAME};PWD={PASSWORD};Connection Timeout=60'
```

### Memory Issues (Large Exports)
If exporting very large tables, use batch processing:
```python
# Process in batches of 1000 records
BATCH_SIZE = 1000
cursor.execute("SELECT * FROM large_table")
while True:
    rows = cursor.fetchmany(BATCH_SIZE)
    if not rows:
        break
    # Process batch
```

## Use Cases

1. **Development/Testing**: Create sample JSON files for local development without SQL database
2. **Data Migration**: Export production data for backup or migration
3. **Demonstrations**: Create representative sample datasets
4. **JSON Mode Fallback**: Generate JSON files when `UseSqlDatabase: false`

## Example Output

```
============================================================
SQL Database to JSON Export
============================================================

📁 Output directory: C:\...\App_Data

✅ Connected to database: Orion

📊 Analyzing operator distribution...
   Found 42 division/status combinations
   1 - LAHORE - ONBOARDING: Selected 10 of 245 operators
   1 - LAHORE - CREDENTIALING: Selected 10 of 123 operators
   ...

✅ Total operators sampled: 387

📜 Exporting certifications...
✅ Exported 1,245 certifications

📊 Exporting status tracker...
✅ Exported 2,103 status tracker records

📋 Exporting pay_StatusTypes...
✅ Exported 156 records

📋 Exporting pay_PizzaStatus...
✅ Exported 27 records

📋 Exporting pay_CertTypes...
✅ Exported 89 records

📋 Exporting pay_Clients...
✅ Exported 12 records

============================================================
✅ Export completed successfully!
============================================================
```

---
*Last Updated: January 18, 2026*
