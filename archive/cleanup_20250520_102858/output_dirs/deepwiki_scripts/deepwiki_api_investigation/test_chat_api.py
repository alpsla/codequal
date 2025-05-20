#!/usr/bin/env python3
"""
DeepWiki Chat API Test Script

This script demonstrates how to ask questions about a repository using DeepWiki's chat API.
"""

import requests
import json
import argparse
import os
import time

def query_repository(repo_url, question, stream=False, deep_research=False):
    """
    Ask a question about a repository using DeepWiki
    
    Args:
        repo_url: URL of the GitHub repository to query
        question: Question to ask about the repository
        stream: Whether to stream the response
        deep_research: Whether to use deep research mode
        
    Returns:
        Chat response
    """
    start_time = time.time()
    
    # Create the request payload
    payload = {
        "repo_url": repo_url,
        "messages": [
            {
                "role": "user",
                "content": question
            }
        ],
        "stream": stream,
        "deep_research": deep_research
    }
    
    print(f"Repository: {repo_url}")
    print(f"Question: {question}")
    print(f"Deep research: {deep_research}")
    
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
            
            print(f"Query completed in {duration:.2f} seconds")
            
            if stream:
                # For streaming responses, we'd need to process the stream
                print("Streaming response received (partial content):")
                print(response.text[:500] + "...")
                return response.text
            else:
                # For non-streaming, return the parsed JSON
                result = response.json()
                print(f"Chat response received ({len(json.dumps(result))} bytes)")
                return result
        else:
            print(f"Error: Received status code {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"Error querying repository: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Test DeepWiki chat API')
    parser.add_argument('repo_url', help='GitHub repository URL')
    parser.add_argument('question', help='Question to ask about the repository')
    parser.add_argument('--output', help='Output file for chat results')
    parser.add_argument('--stream', action='store_true', help='Use streaming mode')
    parser.add_argument('--deep-research', action='store_true', help='Use deep research mode')
    
    args = parser.parse_args()
    
    # Run the chat query
    result = query_repository(args.repo_url, args.question, args.stream, args.deep_research)
    
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
