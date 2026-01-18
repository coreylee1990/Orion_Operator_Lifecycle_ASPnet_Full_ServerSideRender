import json
import os

json_path = os.path.join(os.path.dirname(__file__), '..', 'OrionOperatorLifecycleWebApp', 'App_Data', 'pay_CertTypes.json')

with open(json_path, 'r', encoding='utf-8') as f:
    cert_types = json.load(f)

# Both PizzaStatusIDs for comparison
ps1 = '0F3DDDE2-1920-4E71-A40A-7610F5C58FAC'  # Operator Contracting (Order 13)
ps2 = 'FCCFFEDC-F7AB-4730-B3A6-C1E7B3FE8295'  # Provider Contracting (Order 4)
division = '10 - OR'

print("\n" + "="*100)
print("COMPARISON: Two 'APPROVED FOR CONTRACTING' statuses in Division 10-OR")
print("="*100)

for ps_id, label in [(ps1, "Operator Contracting (Order 13)"), (ps2, "Provider Contracting (Order 4)")]:
    results = [ct for ct in cert_types if ct.get('PizzaStatusID') == ps_id and ct.get('DivisionID') == division and not ct.get('isDeleted')]
    print(f"\n📋 {label}")
    print(f"   PizzaStatusID: {ps_id}")
    print(f"   Found {len(results)} active CertType(s):\n")
    
    if results:
        for i, ct in enumerate(results, 1):
            print(f"   {i}. {ct.get('Certification', 'N/A')}")
            print(f"      ID: {ct.get('ID', 'N/A')}")
    else:
        print("   ❌ No active certs found")
    print()
