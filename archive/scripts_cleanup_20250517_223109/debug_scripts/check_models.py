#!/usr/bin/env python3
# Check model providers in DeepWiki

import requests
import json
import os
import sys

def check_model_providers():
    """Check available model providers in DeepWiki API"""
    print("DeepWiki Model Provider Check")
    print("===========================")
    
    # Try both internal and external URLs
    urls = [
        "http://deepwiki-api:8001",          # For in-cluster service
        "http://deepwiki-fixed:8001",        # For fixed service
        "http://localhost:8001",             # For port-forwarded access
        "http://127.0.0.1:8001"              # Alternative localhost
    ]
    
    successful_url = None
    
    for url in urls:
        print(f"\nTrying URL: {url}")
        try:
            response = requests.get(f"{url}/", timeout=5)
            if response.status_code == 200:
                print(f"✅ Connected to {url}")
                successful_url = url
                break
            else:
                print(f"❌ Failed with status code: {response.status_code}")
        except Exception as e:
            print(f"❌ Connection error: {e}")
    
    if not successful_url:
        print("\nFailed to connect to DeepWiki API")
        return None
    
    # Try to get information about available model providers
    print(f"\nChecking available providers at {successful_url}...")
    providers = ["openai", "anthropic", "google", "deepseek"]
    
    available_providers = {}
    
    for provider in providers:
        print(f"\nTesting provider: {provider}")
        
        # Create a minimal test payload
        if provider == "openai":
            model = "gpt-4o"
        elif provider == "anthropic":
            model = "claude-3-7-sonnet"
        elif provider == "google":
            model = "gemini-2.5-pro-preview-05-06"
        elif provider == "deepseek":
            model = "deepseek-coder"
        else:
            model = "default"
        
        test_payload = {
            "provider": provider,
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello in one word."}
            ],
            "repo_url": "https://github.com/microsoft/fluentui-emoji",  # Small repo for testing
            "max_tokens": 10,
            "stream": True
        }
        
        try:
            # Try the streaming endpoint
            response = requests.post(
                f"{successful_url}/chat/completions/stream",
                json=test_payload,
                timeout=30
            )
            
            # Check response
            print(f"Status code: {response.status_code}")
            
            if response.status_code >= 200 and response.status_code < 300:
                print(f"✅ Provider {provider} is working")
                try:
                    response_content = response.content.decode('utf-8')
                    print(f"Response: {response_content[:100]}...")
                    available_providers[provider] = {
                        "status": "working",
                        "model": model,
                        "response_sample": response_content[:100]
                    }
                except Exception as e:
                    print(f"Error decoding response: {e}")
                    available_providers[provider] = {
                        "status": "working",
                        "model": model,
                        "response_error": str(e)
                    }
            else:
                print(f"❌ Provider {provider} returned error")
                try:
                    error_content = response.json()
                    error_detail = error_content.get("detail", "Unknown error")
                    print(f"Error detail: {error_detail}")
                    available_providers[provider] = {
                        "status": "error",
                        "model": model,
                        "error": error_detail
                    }
                except Exception as e:
                    print(f"Error parsing error response: {e}")
                    available_providers[provider] = {
                        "status": "error",
                        "model": model,
                        "error": str(e)
                    }
        except Exception as e:
            print(f"❌ Request failed: {e}")
            available_providers[provider] = {
                "status": "failed",
                "model": model,
                "error": str(e)
            }
    
    # Summarize results
    print("\nProvider Availability Summary")
    print("===========================")
    
    working_providers = [p for p, details in available_providers.items() if details["status"] == "working"]
    error_providers = [p for p, details in available_providers.items() if details["status"] == "error"]
    failed_providers = [p for p, details in available_providers.items() if details["status"] == "failed"]
    
    print(f"Working providers: {len(working_providers)}/{len(providers)}")
    for provider in working_providers:
        print(f"✅ {provider}: {available_providers[provider]['model']}")
    
    if error_providers:
        print(f"\nProviders with API errors: {len(error_providers)}")
        for provider in error_providers:
            error = available_providers[provider].get("error", "Unknown error")
            print(f"⚠️ {provider}: {error}")
    
    if failed_providers:
        print(f"\nProviders with connection failures: {len(failed_providers)}")
        for provider in failed_providers:
            error = available_providers[provider].get("error", "Unknown error")
            print(f"❌ {provider}: {error}")
    
    # Check for common error patterns
    embedding_size_errors = any(
        "All embeddings should be of the same size" in details.get("error", "") 
        for details in available_providers.values()
    )
    
    config_not_found_errors = any(
        "Configuration for provider" in details.get("error", "") 
        for details in available_providers.values()
    )
    
    if embedding_size_errors:
        print("\n⚠️ Detected 'All embeddings should be of the same size' errors")
        print("This is typically caused by inconsistent embedding dimensions across providers")
        print("Run fix-deepwiki-providers.sh to create a unified embedding configuration")
    
    if config_not_found_errors:
        print("\n⚠️ Detected 'Configuration for provider not found' errors")
        print("This is caused by missing provider configuration files")
        print("Run fix-deepwiki-providers.sh to create missing provider configurations")
    
    return {
        "api_url": successful_url,
        "providers": available_providers
    }

def main():
    provider_results = check_model_providers()
    
    if provider_results:
        print("\nUseful information for DeepWikiKubernetesService implementation:")
        print(f"1. API Base URL: {provider_results['api_url']}")
        print("2. Endpoints:")
        print("   - GET / - API information")
        print("   - POST /chat/completions/stream - Chat completion with repository context")
        print("3. Required parameters:")
        print("   - provider - Model provider (e.g., 'openai', 'anthropic')")
        print("   - model - Specific model name")
        print("   - repo_url - GitHub repository URL")
        print("   - messages - Array of message objects with role and content")
        print("   - stream - Boolean (true for streaming response)")
        print("   - max_tokens - Maximum tokens to generate")
    else:
        print("\nFailed to gather information for DeepWikiKubernetesService")
        print("Check that DeepWiki is properly deployed and accessible")

if __name__ == "__main__":
    main()