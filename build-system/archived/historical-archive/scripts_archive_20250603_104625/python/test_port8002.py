import requests
import json

def test_api():
    """Test API on port 8002"""
    try:
        print("Testing API on port 8002...")
        
        # Try the base URL
        base_url = "http://localhost:8002"
        print(f"\nTrying endpoint: {base_url}")
        try:
            response = requests.get(base_url)
            print(f"GET {base_url}: Status code {response.status_code}")
            print(f"Response content (first 200 chars): {response.text[:200]}")
        except Exception as e:
            print(f"Error with {base_url}: {str(e)}")
        
        # Try the chat endpoint
        print("\nTesting chat endpoint on port 8002...")
        payload = {
            "repo_url": "https://github.com/AsyncFuncAI/deepwiki-open",
            "messages": [
                {
                    "role": "user",
                    "content": "Analyze this repository with concise documentation"
                }
            ],
            "stream": False
        }
        
        chat_endpoint = f"{base_url}/chat/completions/stream"
        print(f"POST {chat_endpoint}")
        response = requests.post(chat_endpoint, json=payload)
        print(f"Status code: {response.status_code}")
        print(f"Response content (first 500 chars): {response.text[:500]}")
        
        # Try to parse as JSON
        try:
            result = response.json()
            print("Successfully parsed JSON response")
            print(f"JSON keys: {list(result.keys())}")
        except Exception as e:
            print(f"Error parsing JSON: {str(e)}")
            
    except Exception as e:
        print(f"Test failed: {str(e)}")

# Run the test
test_api()
