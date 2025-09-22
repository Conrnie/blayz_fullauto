import requests
import json

url = "https://n8n.srv1014337.hstgr.cloud/mcp/69dddc53-c75a-4cfe-8bec-84d4376dd8ae"
headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream"
}
data = {
    "jsonrpc": "2.0",
    "method": "run_tool",
    "params": {
        "tool_name": "Headline_creation",
        "input": "Give me 5 headlines for a new brand of coffee"
    },
    "id": 1
}

response = requests.post(url, headers=headers, data=json.dumps(data))

print(f"Status Code: {response.status_code}")
print(f"Response Body: {response.text}")