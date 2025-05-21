#!/usr/bin/env python3
# Simple connectivity test script for DeepWiki API

import requests
import json
import os
import sys

def test_deepwiki_connectivity():
    """Test basic connectivity to DeepWiki API endpoints"""
    print("DeepWiki Simple Connectivity Test")
    print("=================================")
    
    # Try both internal and external URLs
    urls = [
        "http://localhost:8001",             # For port-forwarded access
        "http://deepwiki-api:8001",          # For in-cluster service
        "http://deepwiki-fixed:8001",        # For fixed service
        "http://127.0.0.1:8001"              # Alternative localhost
    ]
    
    successful_url = None
    
    for url in urls:
        print(f"\nTesting URL: {url}")
        try:
            response = requests.get(f"{url}/", timeout=5)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                print("Success! Response:")
                response_data = response.json()
                print(json.dumps(response_data, indent=2))
                successful_url = url
                break
            else:
                print(f"Unexpected status code: {response.status_code}")
        except Exception as e:
            print(f"Error: {e}")
    
    if not successful_url:
        print("\nAll connection attempts failed!")
        return None
    
    # Test API endpoints from the successful URL
    print("\nDiscovering available endpoints...")
    endpoints = [
        "/",
        "/health",
        "/api/health",
        "/chat/completions/stream",
        "/api/chat/completions/stream",
        "/export/wiki",
        "/api/wiki_cache",
        "/local_repo/structure"
    ]
    
    endpoint_results = {}
    
    for endpoint in endpoints:
        full_url = f"{successful_url}{endpoint}"
        print(f"\nTesting endpoint: {full_url}")
        try:
            response = requests.get(full_url, timeout=5)
            status = response.status_code
            print(f"Status: {status}")
            
            # Add to results
            endpoint_results[endpoint] = {
                "url": full_url,
                "status": status,
                "working": 200 <= status < 400
            }
            
            # Show response for successful GETs
            if 200 <= status < 300:
                try:
                    response_data = response.json()
                    print("Response:")
                    print(json.dumps(response_data, indent=2))
                except:
                    print("Response (non-JSON):")
                    print(response.text[:200] + "..." if len(response.text) > 200 else response.text)
        except Exception as e:
            print(f"Error: {e}")
            endpoint_results[endpoint] = {
                "url": full_url,
                "error": str(e),
                "working": False
            }
    
    # Summarize results
    print("\nEndpoint Connectivity Summary")
    print("============================")
    for endpoint, result in endpoint_results.items():
        status = "✅ Working" if result.get("working") else "❌ Failed"
        print(f"{endpoint.ljust(30)} {status}")
    
    return successful_url

def main():
    successful_url = test_deepwiki_connectivity()
    
    if successful_url:
        print(f"\nSuccessfully connected to DeepWiki at {successful_url}")
        print("You can use this URL to configure the DeepWikiKubernetesService")
    else:
        print("\nFailed to connect to any DeepWiki endpoint")
        print("Check that the DeepWiki services are running and accessible")

if __name__ == "__main__":
    main()