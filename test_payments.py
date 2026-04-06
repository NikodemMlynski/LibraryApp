import requests
import json

token_url = "http://localhost/auth/realms/library-system/protocol/openid-connect/token"
token_data = {
    'client_id': 'library-frontend',
    'username': 'test_admin',
    'password': 'password',
    'grant_type': 'password'
}

try:
    print("Getting token...")
    token_res = requests.post(token_url, data=token_data)
    if token_res.status_code != 200:
        print("Failed to get token:", token_res.text)
        exit(1)
        
    access_token = token_res.json().get('access_token')
    print("Token OK! Getting transactions...")
    
    headers = {'Authorization': f'Bearer {access_token}'}
    res = requests.get("http://localhost/api/payments/admin/transactions", headers=headers)
    print("STATUS:", res.status_code)
    try:
        print("BODY:", json.dumps(res.json(), indent=2))
    except Exception:
        print("BODY (raw):", res.text)
except Exception as e:
    print("Error:", e)
