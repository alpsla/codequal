import requests
import json

try:
    # Get the OpenAPI schema
    response = requests.get("http://localhost:8001/openapi.json")
    if response.status_code == 200:
        schema = response.json()
        print("API Endpoints:")
        for path, methods in schema.get("paths", {}).items():
            for method, details in methods.items():
                print(f"{method.upper()} {path}")
                print(f"  Description: {details.get('description', 'No description')}")
                print(f"  Parameters: {json.dumps(details.get('parameters', []), indent=2)}")
                print()
    else:
        print(f"Failed to get OpenAPI schema: {response.status_code}")
        
        # Alternative approach: check common endpoints
        common_endpoints = [
            "/",
            "/docs",
            "/openapi.json",
            "/chat/completions",
            "/chat/completions/stream",
            "/health",
            "/version"
        ]
        print("\nChecking common endpoints:")
        for endpoint in common_endpoints:
            try:
                response = requests.get(f"http://localhost:8001{endpoint}")
                print(f"GET {endpoint}: {response.status_code}")
            except Exception as e:
                print(f"GET {endpoint}: Error - {str(e)}")
except Exception as e:
    print(f"Error exploring API: {str(e)}")
