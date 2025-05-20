#!/usr/bin/env python3

"""
Python-based Repository Analyzer using OpenRouter
"""

import os
import sys
import json
import requests
import argparse
from datetime import datetime

def parse_args():
    parser = argparse.ArgumentParser(description="Analyze a GitHub repository using OpenRouter")
    parser.add_argument("repo_url", help="URL of the GitHub repository to analyze")
    parser.add_argument("--model", default="anthropic/claude-3-7-sonnet", 
                      help="OpenRouter model to use (default: anthropic/claude-3-7-sonnet)")
    return parser.parse_args()

def ensure_api_key():
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        # Try to load from .env file
        if os.path.exists(".env"):
            with open(".env", "r") as f:
                for line in f:
                    if line.startswith("OPENROUTER_API_KEY="):
                        api_key = line.strip().split("=", 1)[1]
                        # Remove quotes if present
                        api_key = api_key.strip("'").strip('"')
                        break
    
    if not api_key:
        print("Error: OPENROUTER_API_KEY is not set")
        print("Set it with: export OPENROUTER_API_KEY=your-api-key")
        print("Or add it to a .env file in this directory")
        sys.exit(1)
    
    return api_key

def analyze_repository(repo_url, model, api_key):
    # Ensure output directory exists
    output_dir = os.path.join(os.getcwd(), "reports")
    os.makedirs(output_dir, exist_ok=True)
    
    # Format output filename
    repo_name = repo_url.split("/")[-1].replace(".git", "")
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_file = os.path.join(output_dir, f"{repo_name}-{model.replace('/', '-')}-{timestamp}.md")
    
    print(f"Analyzing repository: {repo_url}")
    print(f"Model: {model}")
    print(f"Output file: {output_file}")
    
    # Create analysis prompt
    prompt = f"""
Please analyze this GitHub repository: {repo_url}

Please provide a comprehensive analysis with the following sections:

1. Executive Summary: High-level overview of what this repository does.
2. Architecture Overview: Key components and their relationships.
3. Main Features: Key functionalities implemented.
4. Code Quality Assessment: Evaluation of code organization, patterns, and quality.
5. Dependencies: External libraries and frameworks used.
6. Recommendations: Suggested improvements or best practices to consider.

Note: You have the ability to browse the repository and understand its content. Focus on the actual code in the repository, not just what you know generally about projects with this name.
"""
    
    # Send request to OpenRouter
    print("Sending analysis request to OpenRouter...")
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "https://github.com",
                "X-Title": "Repository Analysis"
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": "You are an expert code analyzer with deep knowledge of software engineering."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 4000,
                "temperature": 0.3
            },
        )
        
        if response.status_code != 200:
            print(f"Error: OpenRouter returned status code {response.status_code}")
            print(response.text)
            return False
        
        # Extract content from response
        result = response.json()
        analysis_content = result["choices"][0]["message"]["content"]
        
        # Create header content
        header_content = f"# Repository Analysis: {repo_url}\n\n" + \
                       f"Generated with: {model}\n" + \
                       f"Date: {datetime.now().isoformat()}\n\n" + \
                       "---\n\n"
        
        # Write to file
        with open(output_file, "w") as f:
            f.write(header_content + analysis_content)
        
        print("Analysis completed successfully")
        print(f"Analysis saved to: {output_file}")
        
        # Print preview
        print("\nReport Preview:")
        print("-" * 40)
        with open(output_file, "r") as f:
            preview_lines = f.readlines()[:15]
            for line in preview_lines:
                print(line.rstrip())
        print("-" * 40)
        print("...")
        
        return True
    
    except Exception as e:
        print(f"Error analyzing repository: {e}")
        return False

def main():
    args = parse_args()
    api_key = ensure_api_key()
    success = analyze_repository(args.repo_url, args.model, api_key)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()