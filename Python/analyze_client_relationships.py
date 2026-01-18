import json
import os
from collections import defaultdict

# Paths
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
app_data_path = os.path.join(project_root, 'OrionOperatorLifecycleWebApp', 'App_Data')
queries_path = os.path.join(project_root, 'Queries')

# Read data files
with open(os.path.join(app_data_path, 'pay_PizzaStatuses.json'), 'r') as f:
    pizza_statuses = json.load(f)

with open(os.path.join(app_data_path, 'pay_StatusTypes.json'), 'r') as f:
    status_types = json.load(f)

with open(os.path.join(app_data_path, 'pay_Clients.json'), 'r') as f:
    clients = json.load(f)

# Create client lookup
client_lookup = {c['ID']: c['Description'] for c in clients}

# Group PizzaStatuses by ClientID
client_pizza_map = defaultdict(list)
for ps in pizza_statuses:
    client_id = ps.get('ClientID')
    if client_id:
        client_pizza_map[client_id].append(ps)

# Build report
report_lines = []
report_lines.append("=" * 100)
report_lines.append("CLIENT RELATIONSHIPS ANALYSIS")
report_lines.append("=" * 100)
report_lines.append("")

# Summary
report_lines.append(f"Total Clients: {len(client_lookup)}")
report_lines.append(f"Total PizzaStatuses: {len(pizza_statuses)}")
report_lines.append(f"Total StatusTypes: {len(status_types)}")
report_lines.append("")
report_lines.append("=" * 100)
report_lines.append("")

# Analyze each client
for client_id in sorted(client_pizza_map.keys(), key=lambda x: client_lookup.get(x, 'Unknown')):
    client_name = client_lookup.get(client_id, 'Unknown Client')
    client_pizzas = client_pizza_map[client_id]
    
    report_lines.append("")
    report_lines.append("=" * 100)
    report_lines.append(f"CLIENT: {client_name}")
    report_lines.append(f"Client ID: {client_id}")
    report_lines.append(f"PizzaStatuses Count: {len(client_pizzas)}")
    report_lines.append("=" * 100)
    report_lines.append("")
    
    # Sort PizzaStatuses by MobileAppOrder
    sorted_pizzas = sorted(
        client_pizzas, 
        key=lambda x: (x.get('MobileAppOrder') is None, x.get('MobileAppOrder', 0))
    )
    
    for ps in sorted_pizzas:
        pizza_id = ps.get('ID')
        status_name = ps.get('Status', 'Unknown')
        description = ps.get('Description', '')
        mobile_order = ps.get('MobileAppOrder', 'N/A')
        is_operator = ps.get('IsOperator', False)
        is_provider = ps.get('IsProvider', False)
        
        report_lines.append(f"  📊 PizzaStatus: {status_name}")
        report_lines.append(f"     ID: {pizza_id}")
        report_lines.append(f"     Description: {description}")
        report_lines.append(f"     MobileAppOrder: {mobile_order}")
        report_lines.append(f"     IsOperator: {is_operator}, IsProvider: {is_provider}")
        
        # Find StatusTypes that reference this PizzaStatus
        related_status_types = [
            st for st in status_types 
            if st.get('PizzaStatusID') == pizza_id
        ]
        
        if related_status_types:
            report_lines.append(f"     → Referenced by {len(related_status_types)} StatusType(s):")
            
            # Group by division
            division_groups = defaultdict(list)
            for st in related_status_types:
                division = st.get('DivisionID', 'Unknown')
                division_groups[division].append(st)
            
            for division in sorted(division_groups.keys()):
                division_sts = division_groups[division]
                report_lines.append(f"        Division: {division}")
                for st in division_sts:
                    st_status = st.get('Status', 'Unknown')
                    st_order = st.get('OrderID', 'N/A')
                    is_deleted = st.get('isDeleted', False)
                    deleted_marker = ' [DELETED]' if is_deleted else ''
                    report_lines.append(f"          • {st_status} (Order: {st_order}){deleted_marker}")
        else:
            report_lines.append(f"     → ⚠️ NOT referenced by any StatusTypes")
        
        report_lines.append("")

# Statistics
report_lines.append("")
report_lines.append("=" * 100)
report_lines.append("STATISTICS")
report_lines.append("=" * 100)
report_lines.append("")

# PizzaStatuses without ClientID
no_client = [ps for ps in pizza_statuses if not ps.get('ClientID')]
if no_client:
    report_lines.append(f"⚠️ PizzaStatuses without ClientID: {len(no_client)}")
    for ps in no_client[:5]:  # Show first 5
        report_lines.append(f"   • {ps.get('Status', 'Unknown')} (ID: {ps.get('ID')})")
    if len(no_client) > 5:
        report_lines.append(f"   ... and {len(no_client) - 5} more")
    report_lines.append("")

# StatusTypes without PizzaStatusID
no_pizza = [st for st in status_types if not st.get('PizzaStatusID')]
if no_pizza:
    report_lines.append(f"⚠️ StatusTypes without PizzaStatusID: {len(no_pizza)}")
    for st in no_pizza[:10]:  # Show first 10
        division = st.get('DivisionID', 'Unknown')
        status = st.get('Status', 'Unknown')
        report_lines.append(f"   • {status} (Division: {division})")
    if len(no_pizza) > 10:
        report_lines.append(f"   ... and {len(no_pizza) - 10} more")
    report_lines.append("")

# Orphaned PizzaStatuses (not referenced by any StatusType)
orphaned = []
for ps in pizza_statuses:
    pizza_id = ps.get('ID')
    has_reference = any(st.get('PizzaStatusID') == pizza_id for st in status_types)
    if not has_reference:
        orphaned.append(ps)

if orphaned:
    report_lines.append(f"⚠️ Orphaned PizzaStatuses (not referenced by StatusTypes): {len(orphaned)}")
    for ps in orphaned[:10]:
        client_id = ps.get('ClientID')
        client_name = client_lookup.get(client_id, 'No Client')
        report_lines.append(f"   • {ps.get('Status', 'Unknown')} - Client: {client_name}")
    if len(orphaned) > 10:
        report_lines.append(f"   ... and {len(orphaned) - 10} more")

report_lines.append("")
report_lines.append("=" * 100)
report_lines.append("END OF REPORT")
report_lines.append("=" * 100)

# Write report
output_file = os.path.join(queries_path, 'client_relationships_analysis.txt')
with open(output_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(report_lines))

print(f"✅ Analysis complete!")
print(f"📄 Report written to: {output_file}")
print(f"\nSummary:")
print(f"  • Clients analyzed: {len(client_pizza_map)}")
print(f"  • PizzaStatuses: {len(pizza_statuses)}")
print(f"  • StatusTypes: {len(status_types)}")
print(f"  • Orphaned PizzaStatuses: {len(orphaned)}")
print(f"  • StatusTypes without PizzaStatusID: {len(no_pizza)}")
