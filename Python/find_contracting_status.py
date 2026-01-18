import json
import os

json_path = os.path.join(os.path.dirname(__file__), '..', 'OrionOperatorLifecycleWebApp', 'App_Data', 'pay_StatusTypes.json')

with open(json_path, 'r', encoding='utf-8') as f:
    status_types = json.load(f)

# Find statuses containing "CONTRACTING" or "Contracting" for division 10 - OR
results = [st for st in status_types if st.get('DivisionID') == '10 - OR' and 'contracting' in st.get('Status', '').lower()]

print(f"\n📊 StatusTypes for '10 - OR' with 'Contracting' in Status:\n")
print(f"=" * 100)

for st in results:
    print(f"\nStatus: {st.get('Status', 'N/A')}")
    print(f"  ID: {st.get('Id', st.get('ID', 'N/A'))}")
    print(f"  PizzaStatusID: {st.get('PizzaStatusID', 'N/A')}")
    print(f"  DivisionID: {st.get('DivisionID', 'N/A')}")
    print(f"  OrderID: {st.get('OrderID', 'N/A')}")
    print(f"  isDeleted: {st.get('isDeleted', 'N/A')}")
