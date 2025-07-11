#!/usr/bin/env python3
"""
CodeQual API Example - Python
Demonstrates how to use the CodeQual API with an Individual subscription
"""

import os
import requests
import json
from datetime import datetime

class CodeQualAPI:
    def __init__(self, email, password, base_url="http://localhost:3001"):
        self.base_url = base_url
        self.email = email
        self.password = password
        self.access_token = None
        self.headers = {"Content-Type": "application/json"}
    
    def authenticate(self):
        """Authenticate with CodeQual and get access token"""
        print("🔐 Authenticating...")
        
        response = requests.post(
            f"{self.base_url}/auth/signin",
            headers=self.headers,
            json={"email": self.email, "password": self.password}
        )
        
        if response.status_code != 200:
            raise Exception(f"Authentication failed: {response.text}")
        
        data = response.json()
        self.access_token = data["session"]["access_token"]
        self.headers["Authorization"] = f"Bearer {self.access_token}"
        
        print("✅ Authentication successful!")
        return self.access_token
    
    def scan_pr(self, repository_url):
        """Scan a pull request or repository"""
        print(f"\n🔍 Scanning: {repository_url}")
        
        response = requests.post(
            f"{self.base_url}/api/simple-scan",
            headers=self.headers,
            json={"repositoryUrl": repository_url}
        )
        
        if response.status_code != 200:
            raise Exception(f"Scan failed: {response.text}")
        
        result = response.json()
        print("✅ Scan completed!")
        print(f"   Report URL: {result.get('reportUrl', 'N/A')}")
        print(f"   Analysis ID: {result.get('analysisId', 'N/A')}")
        
        return result
    
    def check_billing(self):
        """Check current billing status and remaining scans"""
        print("\n💳 Checking billing status...")
        
        response = requests.get(
            f"{self.base_url}/api/billing/status",
            headers=self.headers
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to get billing status: {response.text}")
        
        data = response.json()
        subscription = data.get("subscription", {})
        
        print(f"   Plan: {subscription.get('tier', 'unknown')}")
        print(f"   Status: {subscription.get('status', 'unknown')}")
        
        return data

# Example usage
if __name__ == "__main__":
    # Use environment variables for credentials
    email = os.getenv("CODEQUAL_EMAIL", "rostislav.alpin@gmail.com")
    password = os.getenv("CODEQUAL_PASSWORD")
    
    if not password:
        print("⚠️  Please set CODEQUAL_PASSWORD environment variable")
        print("   Example: export CODEQUAL_PASSWORD='your-password'")
        exit(1)
    
    # Initialize API client
    api = CodeQualAPI(email, password)
    
    try:
        # Authenticate
        api.authenticate()
        
        # Scan a PR
        result = api.scan_pr("https://github.com/facebook/react/pull/27513")
        
        # Check billing
        api.check_billing()
        
        print("\n🎉 API test completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")