import requests
import json

url = "http://localhost:8000/analyze-mood"
payload = {"text": "I feel so nostalgic seeing this vintage typewriter"}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, data=json.dumps(payload), headers=headers)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
