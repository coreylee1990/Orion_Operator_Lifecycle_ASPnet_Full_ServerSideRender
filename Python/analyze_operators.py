"""
Analyze Exported Operator Data
===============================
Generates a summary report of the operators in the JSON files.
Shows distribution by division, status, and other key metrics.

Usage:
    python analyze_operators.py
"""

import json
import os
from collections import defaultdict, Counter
from datetime import datetime

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'OrionOperatorLifecycleWebApp', 'App_Data')

def load_json_file(filename):
    """Load JSON file from App_Data directory."""
    filepath = os.path.join(APP_DATA_DIR, filename)
    if not os.path.exists(filepath):
        print(f"⚠️  File not found: {filepath}")
        return None
    
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def analyze_operators():
    """Analyze operator distribution by division and status."""
    print("=" * 80)
    print("OPERATOR DATA SUMMARY")
    print("=" * 80)
    
    # Load operators
    operators = load_json_file('pay_Operators.json')
    if not operators:
        print("❌ Could not load operators data")
        return
    
    print(f"\n📊 Total Operators: {len(operators)}")
    
    # Group by division and status
    by_division = defaultdict(list)
    by_status = defaultdict(list)
    by_division_status = defaultdict(lambda: defaultdict(list))
    
    for op in operators:
        division_id = op.get('DivisionID') or 'Unknown'
        status = op.get('Status') or 'None'
        
        by_division[division_id].append(op)
        by_status[status].append(op)
        by_division_status[division_id][status].append(op)
    
    # Summary by Division
    print("\n" + "=" * 80)
    print("SUMMARY BY DIVISION")
    print("=" * 80)
    print(f"{'Division':<30} {'Count':>10}")
    print("-" * 80)
    
    for division in sorted(by_division.keys()):
        count = len(by_division[division])
        print(f"{division:<30} {count:>10}")
    
    # Summary by Status
    print("\n" + "=" * 80)
    print("SUMMARY BY STATUS")
    print("=" * 80)
    print(f"{'Status':<40} {'Count':>10}")
    print("-" * 80)
    
    for status in sorted(by_status.keys()):
        count = len(by_status[status])
        print(f"{status:<40} {count:>10}")
    
    # Detailed breakdown: Division + Status
    print("\n" + "=" * 80)
    print("DETAILED BREAKDOWN: DIVISION + STATUS")
    print("=" * 80)
    print(f"{'Division':<30} {'Status':<40} {'Count':>10}")
    print("-" * 80)
    
    for division in sorted(by_division_status.keys()):
        for status in sorted(by_division_status[division].keys()):
            count = len(by_division_status[division][status])
            print(f"{division:<30} {status:<40} {count:>10}")
    
    return operators, by_division_status

def analyze_certifications(operators):
    """Analyze certification data for the operators."""
    print("\n" + "=" * 80)
    print("CERTIFICATION SUMMARY")
    print("=" * 80)
    
    # Load certifications
    certifications = load_json_file('pay_Certifications.json')
    if not certifications:
        print("⚠️  Could not load certifications data")
        return
    
    print(f"\n📜 Total Certifications: {len(certifications)}")
    
    # Group by operator
    certs_by_operator = defaultdict(list)
    for cert in certifications:
        operator_id = cert.get('OperatorID')
        if operator_id:
            certs_by_operator[operator_id].append(cert)
    
    # Calculate stats
    operators_with_certs = len(certs_by_operator)
    operators_without_certs = len(operators) - operators_with_certs
    
    cert_counts = [len(certs) for certs in certs_by_operator.values()]
    avg_certs = sum(cert_counts) / len(cert_counts) if cert_counts else 0
    max_certs = max(cert_counts) if cert_counts else 0
    min_certs = min(cert_counts) if cert_counts else 0
    
    print(f"   Operators with certifications: {operators_with_certs}")
    print(f"   Operators without certifications: {operators_without_certs}")
    print(f"   Average certifications per operator: {avg_certs:.1f}")
    print(f"   Max certifications (single operator): {max_certs}")
    print(f"   Min certifications (single operator): {min_certs}")
    
    # Top certification types
    cert_types = Counter()
    for cert in certifications:
        cert_name = cert.get('Cert') or 'Unknown'
        cert_types[cert_name] += 1
    
    print(f"\n📋 Top 10 Certification Types:")
    print(f"{'Certification Name':<50} {'Count':>10}")
    print("-" * 80)
    for cert_name, count in cert_types.most_common(10):
        print(f"{cert_name[:48]:<50} {count:>10}")

def analyze_status_tracker(operators):
    """Analyze status tracker data."""
    print("\n" + "=" * 80)
    print("STATUS TRACKER SUMMARY")
    print("=" * 80)
    
    # Load status tracker
    status_tracker = load_json_file('pay_StatusTracker.json')
    if not status_tracker:
        print("⚠️  Could not load status tracker data")
        return
    
    print(f"\n📊 Total Status Tracker Records: {len(status_tracker)}")
    
    # Group by operator
    tracker_by_operator = defaultdict(list)
    for record in status_tracker:
        operator_id = record.get('OperatorID')
        if operator_id:
            tracker_by_operator[operator_id].append(record)
    
    # Calculate stats
    operators_with_history = len(tracker_by_operator)
    operators_without_history = len(operators) - operators_with_history
    
    history_counts = [len(records) for records in tracker_by_operator.values()]
    avg_records = sum(history_counts) / len(history_counts) if history_counts else 0
    max_records = max(history_counts) if history_counts else 0
    
    print(f"   Operators with status history: {operators_with_history}")
    print(f"   Operators without status history: {operators_without_history}")
    print(f"   Average status changes per operator: {avg_records:.1f}")
    print(f"   Max status changes (single operator): {max_records}")

def export_to_csv(by_division_status):
    """Export the division/status summary to CSV."""
    output_file = os.path.join(SCRIPT_DIR, 'operator_summary.csv')
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("Division,Status,Count\n")
        
        for division in sorted(by_division_status.keys()):
            for status in sorted(by_division_status[division].keys()):
                count = len(by_division_status[division][status])
                # Escape commas in division/status names
                div_safe = f'"{division}"' if ',' in division else division
                status_safe = f'"{status}"' if ',' in status else status
                f.write(f"{div_safe},{status_safe},{count}\n")
    
    print(f"\n💾 Exported summary to: {output_file}")

def main():
    """Main analysis function."""
    operators, by_division_status = analyze_operators()
    
    if operators:
        analyze_certifications(operators)
        analyze_status_tracker(operators)
        export_to_csv(by_division_status)
    
    print("\n" + "=" * 80)
    print("✅ Analysis completed!")
    print("=" * 80)

if __name__ == '__main__':
    main()
