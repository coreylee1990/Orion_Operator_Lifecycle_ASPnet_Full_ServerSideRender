"""
Export SQL Database to JSON Files
==================================
Exports data from the Orion SQL database to JSON files for the ASP.NET app.
"""

import pyodbc
import json
import os
from datetime import datetime
from decimal import Decimal

# Database connection details
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
    """Convert SQL value to JSON-compatible format."""
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
    """Export operators with sampling strategy."""
    cursor = conn.cursor()
    print("\n📊 Analyzing operator distribution...")
    
    cursor.execute("""
        SELECT DivisionID, Status, COUNT(*) as OperatorCount
        FROM pay_Operators
        WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
        GROUP BY DivisionID, Status
        ORDER BY DivisionID, Status
    """)
    
    combinations = cursor.fetchall()
    sampled_operators = []
    operator_ids = set()
    
    for combo in combinations:
        division, status, count = combo
        cursor.execute(f"""
            SELECT TOP {max_per_division_status}
                ID, FirstName, LastName, Email, Mobile, DivisionID,
                Status, StatusID, IsDeleted, RecordAt, RecordBy, UpdateAt, UpdateBy
            FROM pay_Operators
            WHERE DivisionID = ? AND Status = ? AND (IsDeleted = 0 OR IsDeleted IS NULL)
            ORDER BY UpdateAt DESC, RecordAt DESC
        """, (division, status))
        
        rows = cursor.fetchall()
        for row in rows:
            operator = row_to_dict(cursor, row)
            sampled_operators.append(operator)
            operator_ids.add(operator['ID'])
        
        print(f"   {division} - {status}: Selected {len(rows)} of {count} operators")
    
    output_file = os.path.join(OUTPUT_DIR, 'pay_Operators.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(sampled_operators, f, indent=2, ensure_ascii=False)
    
    return list(operator_ids)

def export_related_data(conn, table_name, operator_ids, output_filename):
    """Helper to export records filtered by OperatorID list."""
    if not operator_ids:
        return
    
    cursor = conn.cursor()
    # SQL Server has a limit on parameters, but for ~100-200 IDs this is fine
    placeholders = ','.join(['?' for _ in operator_ids])
    query = f"SELECT * FROM {table_name} WHERE OperatorID IN ({placeholders})"
    
    print(f"\n🔗 Exporting {table_name} for sampled operators...")
    cursor.execute(query, operator_ids)
    rows = [row_to_dict(cursor, row) for row in cursor.fetchall()]
    
    output_file = os.path.join(OUTPUT_DIR, output_filename)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)
    print(f"✅ Exported {len(rows)} records to {output_filename}")

def export_certifications(conn, operator_ids):
    """Export pay_Certifications for sampled operators, filtering for isApproved=1."""
    if not operator_ids:
        return
    
    cursor = conn.cursor()
    placeholders = ','.join(['?' for _ in operator_ids])
    # Filter for approved certifications
    query = f"SELECT * FROM pay_Certifications WHERE isApproved = 1 AND OperatorID IN ({placeholders})"
    
    print(f"\n🔗 Exporting pay_Certifications (isApproved=1) for sampled operators...")
    cursor.execute(query, operator_ids)
    rows = [row_to_dict(cursor, row) for row in cursor.fetchall()]
    
    output_file = os.path.join(OUTPUT_DIR, 'pay_Certifications.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)
    print(f"✅ Exported {len(rows)} approved certifications to pay_Certifications.json")

def export_cert_types(conn):
    """Export pay_CertTypes with specific required fields."""
    cursor = conn.cursor()
    print("\n📜 Exporting pay_CertTypes (Specific Fields)...")
    
    # Query updated to include your requested fields
    query = """
        SELECT 
            ID, 
            Certification, 
            Description, 
            DivisionID, 
            PizzaStatusID,
            isFleet, 
            isProvider, 
            isDeleted, 
            MobileAppOrder, 
            DocumentTypeID
        FROM pay_CertTypes
        WHERE (isDeleted = 0 OR isDeleted IS NULL)
        ORDER BY DivisionID, MobileAppOrder
    """
    cursor.execute(query)
    rows = [row_to_dict(cursor, row) for row in cursor.fetchall()]
    
    output_file = os.path.join(OUTPUT_DIR, 'pay_CertTypes.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)
    print(f"✅ Exported {len(rows)} CertTypes")

def export_pizza_statuses(conn):
    """Export pay_PizzaStatus with specific required fields."""
    cursor = conn.cursor()
    print("\n🍕 Exporting pay_PizzaStatus (Specific Fields)...")
    
    query = """
        SELECT 
            ID, 
            Status, 
            Description, 
            ClientID, 
            IsOperator, 
            IsProvider,
            isAuto,
            MobileAppOrder,
            isActive,
            NounID,
            SubNounID
        FROM pay_PizzaStatus
        ORDER BY ClientID, MobileAppOrder
    """
    cursor.execute(query)
    rows = [row_to_dict(cursor, row) for row in cursor.fetchall()]
    
    output_file = os.path.join(OUTPUT_DIR, 'pay_PizzaStatuses.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)
    print(f"✅ Exported {len(rows)} PizzaStatuses")

def export_table(conn, table_name, output_filename, where_clause=""):
    """Export a complete table to JSON."""
    cursor = conn.cursor()
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

def main():
    print("=" * 60)
    print("SQL Database to JSON Export")
    print("=" * 60)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    conn = connect_to_database()
    
    try:
        # 1. Export Operators (Sampled)
        operator_ids = export_operators(conn, max_per_division_status=10)
        
        # 2. Export Related Child Data
        export_certifications(conn, operator_ids)
        # export_related_data(conn, 'pay_Certifications', operator_ids, 'pay_Certifications.json')
        export_related_data(conn, 'pay_StatusTracker', operator_ids, 'pay_StatusTracker.json')
        
        # 3. Export Reference Tables
        # Updated CertTypes function with your specific fields
        export_cert_types(conn)
        
        export_table(conn, 'pay_StatusTypes', 'pay_StatusTypes.json', 
                     "(isDeleted = 0 OR isDeleted IS NULL)")
        
        export_pizza_statuses(conn)
        export_table(conn, 'pay_Clients', 'pay_Clients.json')
        
        print("\n" + "=" * 60)
        print("✅ Export completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during export: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    main()