#!/usr/bin/env python3
"""
DeepWiki Repository Analysis Test Script

This script demonstrates how to analyze a repository using DeepWiki's API.
"""

import requests
import json
import argparse
import os
import time

def analyze_repository(repo_url, mode='comprehensive', stream=False):
    """
    Analyze a repository using DeepWiki
    
    Args:
        repo_url: URL of the GitHub repository to analyze
        mode: 'comprehensive' or 'concise'
        stream: Whether to stream the response
        
    Returns:
        Analysis results
    """
    start_time = time.time()
    
    # Prepare the query based on mode
    content = "Analyze this repository"
    if mode == 'concise':
        content += " with concise documentation"
    
    # Create the request payload
    payload = {
        "repo_url": repo_url,
        "messages": [
            {
                "role": "user",
                "content": content
            }
        ],
        "stream": stream
    }
    
    print(f"Analyzing repository: {repo_url}")
    print(f"Mode: {mode}")
    
    try:
        # Make the request
        response = requests.post(
            "http://localhost:8001/chat/completions/stream",
            json=payload
        )
        
        # Check for success
        if response.status_code == 200:
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"Analysis completed in {duration:.2f} seconds")
            
            if stream:
                # For streaming responses, we'd need to process the stream
                print("Streaming response received (partial content):")
                print(response.text[:500] + "...")
                return response.text
            else:
                # For non-streaming, return the parsed JSON
                result = response.json()
                print(f"Analysis result received ({len(json.dumps(result))} bytes)")
                return result
        else:
            print(f"Error: Received status code {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"Error analyzing repository: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Test DeepWiki repository analysis')
    parser.add_argument('repo_url', help='GitHub repository URL')
    parser.add_argument('--mode', choices=['comprehensive', 'concise'], default='comprehensive',
                        help='Analysis mode')
    parser.add_argument('--output', help='Output file for analysis results')
    parser.add_argument('--stream', action='store_true', help='Use streaming mode')
    
    args = parser.parse_args()
    
    # Run the analysis
    result = analyze_repository(args.repo_url, args.mode, args.stream)
    
    # Save the results if requested
    if args.output and result:
        with open(args.output, 'w') as f:
            if isinstance(result, str):
                f.write(result)
            else:
                json.dump(result, f, indent=2)
        print(f"Results saved to {args.output}")

if __name__ == "__main__":
    main()
