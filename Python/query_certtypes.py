import json
import sys
import os

# Get the path to the JSON file
json_path = os.path.join(os.path.dirname(__file__), '..', 'OrionOperatorLifecycleWebApp', 'App_Data', 'pay_CertTypes.json')

# Load the JSON data
with open(json_path, 'r', encoding='utf-8') as f:
    cert_types = json.load(f)

# Filter criteria
division_id = '10 - OR'
pizza_status_id = '0F3DDDE2-1920-4E71-A40A-7610F5C58FAC'

# Filter the data
filtered = [ct for ct in cert_types if ct.get('DivisionID') == division_id and ct.get('PizzaStatusID') == pizza_status_id]

print(f"\n📊 Query Results:")
print(f"=" * 80)
print(f"WHERE DivisionID = '{division_id}'")
print(f"  AND PizzaStatusID = '{pizza_status_id}'")
print(f"\n🔍 Found {len(filtered)} matching CertType(s):\n")

if filtered:
    for i, ct in enumerate(filtered, 1):
        print(f"{i}. {ct.get('Certification', 'N/A')}")
        print(f"   ID: {ct.get('ID', 'N/A')}")
        print(f"   Description: {ct.get('Description', 'N/A')}")
        print(f"   DivisionID: {ct.get('DivisionID', 'N/A')}")
        print(f"   PizzaStatusID: {ct.get('PizzaStatusID', 'N/A')}")
        print(f"   isDeleted: {ct.get('isDeleted', 'N/A')}")
        print()
else:
    print("❌ No matching records found.")
