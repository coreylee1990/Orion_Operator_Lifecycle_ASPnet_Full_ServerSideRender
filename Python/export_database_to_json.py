"""
Export SQL Database to JSON Files
==================================
Exports data from the Orion SQL database to JSON files for the ASP.NET app.

Key Features:
- Exports operators with sampling: max 10 operators per division/status combination
- Exports all related tables (StatusTypes, PizzaStatuses, CertTypes, Certifications, etc.)
- Maintains data relationships and referential integrity
- Outputs to OrionOperatorLifecycleWebApp/App_Data/ folder

Usage:
    python export_database_to_json.py

Requirements:
    pip install pyodbc
"""

import pyodbc
import json
import os
from datetime import datetime
from decimal import Decimal
from collections import defaultdict

# Database connection details (from appsettings.Development.json)
SERVER = 'oriontcms.database.windows.net'
DATABASE = 'Orion'
USERNAME = 'tcms_admin'
PASSWORD = 'Fouru2nvu9'

# Output directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'OrionOperatorLifecycleWebApp', 'App_Data')

# Connection string
CONNECTION_STRING = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER};DATABASE={DATABASE};UID={USERNAME};PWD={PASSWORD}'

def connect_to_database():
    """Establish connection to SQL Server database."""
    try:
        conn = pyodbc.connect(CONNECTION_STRING)
        print(f"✅ Connected to database: {DATABASE}")
        return conn
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        raise

def convert_value(value):
    """Convert SQL value to JSON-compatible format matching existing JSON schema."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, bytes):
        return value.decode('utf-8', errors='ignore')
    return value

def row_to_dict(cursor, row):
    """Convert database row to dictionary."""
    columns = [column[0] for column in cursor.description]
    return {col: convert_value(val) for col, val in zip(columns, row)}

def export_operators(conn, max_per_division_status=10):
    """
    Export operators with sampling strategy.
    
    Strategy:
    - For each division + status combination, select max 10 operators
    - Ensures diverse representation across all divisions and statuses
    - Prioritizes recently updated operators
    """
    cursor = conn.cursor()
    
    # Get all division/status combinations with operator counts
    print("\n📊 Analyzing operator distribution...")
    cursor.execute("""
        SELECT 
            DivisionID,
            Status,
            COUNT(*) as OperatorCount
        FROM pay_Operators
        WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
        GROUP BY DivisionID, Status
        ORDER BY DivisionID, Status
    """)
    
    combinations = cursor.fetchall()
    print(f"   Found {len(combinations)} division/status combinations")
    
    # Sample operators from each combination
    sampled_operators = []
    operator_ids = set()
    
    for combo in combinations:
        division, status, count = combo
        
        # Get top N operators from this division/status (most recently updated first)
        cursor.execute(f"""
            SELECT TOP {max_per_division_status} *
            FROM pay_Operators
            WHERE DivisionID = ? 
              AND Status = ?
              AND (IsDeleted = 0 OR IsDeleted IS NULL)
            ORDER BY UpdateAt DESC, RecordAt DESC
        """, (division, status))
        
        rows = cursor.fetchall()
        for row in rows:
            operator = row_to_dict(cursor, row)
            sampled_operators.append(operator)
            operator_ids.add(operator['ID'])
        
        print(f"   {division} - {status}: Selected {len(rows)} of {count} operators")
    
    print(f"\n✅ Total operators sampled: {len(sampled_operators)}")
    
    # Export to JSON
    output_file = os.path.join(OUTPUT_DIR, 'pay_Operators.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(sampled_operators, f, indent=2, ensure_ascii=False)
    print(f"   Exported to: {output_file}")
    
    return operator_ids

def export_certifications(conn, operator_ids):
    """Export certifications for the sampled operators."""
    cursor = conn.cursor()
    
    # Convert operator_ids set to SQL-compatible format
    if not operator_ids:
        print("⚠️  No operators to export certifications for")
        return
    
    operator_ids_list = "', '".join(operator_ids)
    
    print("\n📜 Exporting certifications...")
    cursor.execute(f"""
        SELECT *
        FROM pay_Certifications
        WHERE OperatorID IN ('{operator_ids_list}')
          AND (IsDeleted = 0 OR IsDeleted IS NULL)
        ORDER BY OperatorID, Date DESC
    """)
    
    certifications = [row_to_dict(cursor, row) for row in cursor.fetchall()]
    
    output_file = os.path.join(OUTPUT_DIR, 'pay_Certifications.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(certifications, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Exported {len(certifications)} certifications")
    print(f"   Exported to: {output_file}")

def export_status_tracker(conn, operator_ids):
    """Export status tracker records for the sampled operators."""
    cursor = conn.cursor()
    
    if not operator_ids:
        print("⚠️  No operators to export status tracker for")
        return
    
    operator_ids_list = "', '".join(operator_ids)
    
    print("\n📊 Exporting status tracker...")
    cursor.execute(f"""
        SELECT *
        FROM pay_StatusTracker
        WHERE OperatorID IN ('{operator_ids_list}')
        ORDER BY OperatorID, Date DESC
    """)
    
    status_tracker = [row_to_dict(cursor, row) for row in cursor.fetchall()]
    
    output_file = os.path.join(OUTPUT_DIR, 'pay_StatusTracker.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(status_tracker, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Exported {len(status_tracker)} status tracker records")
    print(f"   Exported to: {output_file}")

def export_table(conn, table_name, output_filename=None, where_clause=""):
    """Export a complete table to JSON."""
    cursor = conn.cursor()
    
    if output_filename is None:
        output_filename = f'{table_name}.json'
    
    query = f"SELECT * FROM {table_name}"
    if where_clause:
        query += f" WHERE {where_clause}"
    
    print(f"\n📋 Exporting {table_name}...")
    cursor.execute(query)
    
    rows = [row_to_dict(cursor, row) for row in cursor.fetchall()]
    
    output_file = os.path.join(OUTPUT_DIR, output_filename)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Exported {len(rows)} records")
    print(f"   Exported to: {output_file}")

def main():
    """Main export function."""
    print("=" * 60)
    print("SQL Database to JSON Export")
    print("=" * 60)
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"\n📁 Output directory: {OUTPUT_DIR}")
    
    # Connect to database
    conn = connect_to_database()
    
    try:
        # Export operators with sampling (max 10 per division/status)
        operator_ids = export_operators(conn, max_per_division_status=10)
        
        # Export certifications for sampled operators
        export_certifications(conn, operator_ids)
        
        # Export status tracker for sampled operators
        export_status_tracker(conn, operator_ids)
        
        # Export reference tables (full export, no sampling)
        export_table(conn, 'pay_StatusTypes', 'pay_StatusTypes.json', 
                     where_clause="(isDeleted = 0 OR isDeleted IS NULL)")
        
        export_table(conn, 'pay_PizzaStatus', 'pay_PizzaStatuses.json')
        
        export_table(conn, 'pay_CertTypes', 'pay_CertTypes.json',
                     where_clause="(isDeleted = 0 OR isDeleted IS NULL)")
        
        export_table(conn, 'pay_Clients', 'pay_Clients.json')
        
        print("\n" + "=" * 60)
        print("✅ Export completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during export: {e}")
        raise
    finally:
        conn.close()
        print("\n🔒 Database connection closed")

if __name__ == '__main__':
    main()
