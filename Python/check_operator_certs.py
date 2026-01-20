import json
import os
from collections import defaultdict

def check_certs():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app_data_dir = os.path.join(base_dir, 'OrionOperatorLifecycleWebApp', 'App_Data')
    
    operators_path = os.path.join(app_data_dir, 'pay_Operators.json')
    certs_path = os.path.join(app_data_dir, 'pay_Certifications.json')
    
    print(f"Checking data in: {app_data_dir}")
    
    try:
        with open(operators_path, 'r', encoding='utf-8') as f:
            operators = json.load(f)
        print(f"✅ Loaded {len(operators)} operators.")
    except Exception as e:
        print(f"❌ Error loading operators: {e}")
        return

    try:
        with open(certs_path, 'r', encoding='utf-8') as f:
            certs_data = json.load(f)
            # Handle potential wrappers if file format varies
            if isinstance(certs_data, dict) and 'certifications' in certs_data:
                certs = certs_data['certifications']
            elif isinstance(certs_data, list):
                certs = certs_data
            else:
                certs = []
        print(f"✅ Loaded {len(certs)} certifications.")
    except Exception as e:
        print(f"❌ Error loading certifications: {e}")
        return

    # Map certs to operators
    operator_cert_counts = defaultdict(int)
    cert_operator_ids = set()
    
    for cert in certs:
        op_id = cert.get('OperatorID') or cert.get('OperatorId')
        if op_id:
            operator_cert_counts[op_id] += 1
            cert_operator_ids.add(op_id)
            
    # Analyze
    operators_with_certs = 0
    operators_without_certs = 0
    
    print("\n--- Analysis ---")
    for op in operators:
        op_id = op.get('ID') or op.get('Id')
        if not op_id:
            continue
            
        count = operator_cert_counts.get(op_id, 0)
        if count > 0:
            operators_with_certs += 1
        else:
            operators_without_certs += 1
            
        # Optional: Print details for specific divisions or statuses if needed
        # if op.get('DivisionID') == '5 - CA':
        #     print(f"Operator {op.get('FirstName')} {op.get('LastName')} (ID: {op_id}): {count} certs")

    print(f"Operators with at least one certification: {operators_with_certs}")
    print(f"Operators with zero certifications: {operators_without_certs}")
    
    print(f"Total Certifications: {len(certs)}")
    print(f"Unique Operators linked in Certifications file: {len(cert_operator_ids)}")

    # Sample check
    print("\n--- Sample Check (First 5 Operators with Certs) ---")
    count = 0
    for op in operators:
        op_id = op.get('ID') or op.get('Id')
        c_count = operator_cert_counts.get(op_id, 0)
        if c_count > 0:
            print(f"- {op.get('FirstName')} {op.get('LastName')} ({op.get('DivisionID')}): {c_count} certs")
            count += 1
            if count >= 5:
                break

if __name__ == "__main__":
    check_certs()
