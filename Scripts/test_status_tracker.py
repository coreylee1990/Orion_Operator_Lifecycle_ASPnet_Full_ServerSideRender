"""
Test script to debug StatusTracker days calculation
Analyzes JSON data to verify why "Days in Status" shows Unknown
"""

import json
from datetime import datetime
from pathlib import Path

# Load JSON files
app_data_path = Path(__file__).parent.parent / "OrionOperatorLifecycleWebApp" / "App_Data"

print("=" * 80)
print("STATUS TRACKER ANALYSIS")
print("=" * 80)

# Load data
with open(app_data_path / "pay_Operators.json", "r") as f:
    operators = json.load(f)

with open(app_data_path / "pay_StatusTypes.json", "r") as f:
    status_types = json.load(f)

with open(app_data_path / "pay_StatusTracker.json", "r") as f:
    status_tracker = json.load(f)

print(f"\n📊 Data loaded:")
print(f"   Operators: {len(operators)}")
print(f"   StatusTypes: {len(status_types)}")
print(f"   StatusTracker records: {len(status_tracker)}")

# Pick a sample operator to analyze
sample_operator = operators[0] if operators else None

if not sample_operator:
    print("\n❌ No operators found!")
    exit(1)

print(f"\n🔍 Analyzing sample operator:")
print(f"   ID: {sample_operator.get('ID')}")
print(f"   Name: {sample_operator.get('FirstName', '')} {sample_operator.get('LastName', '')}")
print(f"   Status: {sample_operator.get('Status')}")
print(f"   StatusName: {sample_operator.get('StatusName')}")
print(f"   DivisionID: {sample_operator.get('DivisionID')}")

# Find all status tracker records for this operator
operator_id = sample_operator['ID']
operator_records = [st for st in status_tracker if st.get('OperatorID') == operator_id]

print(f"\n📋 StatusTracker records for this operator: {len(operator_records)}")

if operator_records:
    print("\n   Recent records (showing 5 most recent):")
    # Sort by date descending
    sorted_records = sorted(operator_records, key=lambda x: x.get('Date', ''), reverse=True)[:5]
    
    for i, record in enumerate(sorted_records, 1):
        print(f"\n   Record {i}:")
        print(f"      StatusID: {record.get('StatusID')}")
        print(f"      Date: {record.get('Date')}")
        print(f"      DivisionID: {record.get('DivisionID')}")
        
        # Try to find matching StatusType
        status_id = record.get('StatusID')
        matching_st = next((st for st in status_types if st.get('Id') == status_id), None)
        if matching_st:
            print(f"      → Status Name: {matching_st.get('Status')}")
            print(f"      → Division: {matching_st.get('DivisionID')}")
else:
    print("   ⚠️ No StatusTracker records found for this operator!")

# Find the StatusType matching operator's current status
# Use 'Status' field (not 'StatusName') to match JavaScript logic
current_status = sample_operator.get('Status')
current_division = sample_operator.get('DivisionID')

print(f"\n🎯 Looking for StatusType matching:")
print(f"   Status: {current_status}")
print(f"   Division: {current_division}")

matching_status_type = next(
    (st for st in status_types 
     if st.get('Status') == current_status 
     and st.get('DivisionID') == current_division),
    None
)

if matching_status_type:
    print(f"\n✅ Found matching StatusType:")
    print(f"   Id: {matching_status_type.get('Id')}")
    print(f"   Status: {matching_status_type.get('Status')}")
    print(f"   DivisionID: {matching_status_type.get('DivisionID')}")
    print(f"   PizzaStatusID: {matching_status_type.get('PizzaStatusID')}")
    
    # Find StatusTracker records matching this StatusID
    current_status_records = [
        st for st in operator_records 
        if st.get('StatusID') == matching_status_type.get('Id')
    ]
    
    print(f"\n📅 StatusTracker records for CURRENT status: {len(current_status_records)}")
    
    if current_status_records:
        # Find most recent
        most_recent = max(current_status_records, key=lambda x: x.get('Date', ''))
        
        print(f"\n   Most recent record:")
        print(f"      Date: {most_recent.get('Date')}")
        
        # Calculate days
        status_date = datetime.fromisoformat(most_recent['Date'].replace('Z', '+00:00'))
        today = datetime.now(status_date.tzinfo) if status_date.tzinfo else datetime.now()
        days_diff = (today - status_date).days
        
        print(f"      Days in status: {days_diff}")
        print(f"      {'🚨 OVERDUE (30+ days)' if days_diff >= 30 else '✅ Within 30 days'}")
    else:
        print("\n   ⚠️ No StatusTracker records match the current StatusID!")
        print("   This is why 'Days in Status' shows 'Unknown'")
else:
    print("\n❌ No matching StatusType found!")
    print("   This is why 'Days in Status' shows 'Unknown'")

# Show all unique StatusIDs in StatusTracker for this operator
if operator_records:
    unique_status_ids = set(r.get('StatusID') for r in operator_records if r.get('StatusID'))
    print(f"\n📊 All unique StatusIDs in StatusTracker for this operator ({len(unique_status_ids)}):")
    for status_id in list(unique_status_ids)[:10]:  # Show first 10
        matching_st = next((st for st in status_types if st.get('Id') == status_id), None)
        if matching_st:
            print(f"   {status_id} → {matching_st.get('Status')} ({matching_st.get('DivisionID')})")
        else:
            print(f"   {status_id} → (No matching StatusType found)")

# Additional debugging: Check for case sensitivity issues
print(f"\n🔍 Checking for potential issues:")

# Case sensitivity check
operator_status_lower = current_status.lower() if current_status else ""
matching_case_insensitive = [
    st for st in status_types 
    if (st.get('Status') or "").lower() == operator_status_lower
    and st.get('DivisionID') == current_division
]

if matching_case_insensitive and not matching_status_type:
    print(f"   ⚠️ Case sensitivity issue detected!")
    print(f"      Operator Status: '{current_status}'")
    print(f"      Found StatusType with: '{matching_case_insensitive[0].get('Status')}'")

# Check if operator's Status field differs from StatusName
if sample_operator.get('Status') != sample_operator.get('StatusName'):
    print(f"   ℹ️ Status mismatch:")
    print(f"      Status: {sample_operator.get('Status')}")
    print(f"      StatusName: {sample_operator.get('StatusName')}")

print("\n" + "=" * 80)
print("ANALYSIS COMPLETE")
print("=" * 80)
