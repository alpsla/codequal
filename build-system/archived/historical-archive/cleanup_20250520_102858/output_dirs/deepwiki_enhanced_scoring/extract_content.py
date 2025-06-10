#!/usr/bin/env python3
import json
import sys
import os
import re

# Input and output file paths from command line arguments
if len(sys.argv) != 3:
    print("Usage: python extract_content.py input_file output_file")
    sys.exit(1)

input_file = sys.argv[1]
output_file = sys.argv[2]

# Read the raw response
try:
    with open(input_file, 'r') as f:
        raw_content = f.read()
    
    print(f"Read {len(raw_content)} bytes from {input_file}")
    
    # Save the raw content for reference
    with open(f"{input_file}.debug", 'w') as f:
        f.write(raw_content)
    
    # First, try to parse as plain JSON
    try:
        data = json.loads(raw_content)
        print("Successfully parsed as JSON")
        
        # Create a detailed debug file for inspection
        with open(f"{input_file}.structure", 'w') as f:
            f.write(f"JSON Keys at root level: {list(data.keys())}\n\n")
            f.write(f"Full JSON structure:\n{json.dumps(data, indent=2)}\n")
        
        # Handle different API response formats
        content = None
        
        # OpenAI format
        if 'choices' in data and len(data['choices']) > 0:
            if 'message' in data['choices'][0] and 'content' in data['choices'][0]['message']:
                content = data['choices'][0]['message']['content']
                print("Extracted from choices[0].message.content (OpenAI format)")
            elif 'text' in data['choices'][0]:
                content = data['choices'][0]['text']
                print("Extracted from choices[0].text (Completion format)")
        
        # Anthropic format
        elif 'content' in data and isinstance(data['content'], list):
            content_parts = []
            for item in data['content']:
                if 'text' in item:
                    content_parts.append(item['text'])
            content = ''.join(content_parts)
            print("Extracted from content[].text (Anthropic format)")
        
        # Simple content field
        elif 'content' in data and isinstance(data['content'], str):
            content = data['content']
            print("Extracted from content field (Simple format)")
        
        # Response field (common in proxy APIs)
        elif 'response' in data:
            content = data['response']
            print("Extracted from response field (Proxy format)")
        
        # OpenRouter format
        elif 'choices' in data and len(data['choices']) > 0 and 'text' in data['choices'][0]:
            content = data['choices'][0]['text']
            print("Extracted from choices[0].text (OpenRouter format)")
        
        # Check for DeepWiki specific format
        elif 'result' in data:
            if isinstance(data['result'], str):
                content = data['result']
                print("Extracted from result field (string format)")
            elif isinstance(data['result'], dict) and 'content' in data['result']:
                content = data['result']['content']
                print("Extracted from result.content field")
            elif isinstance(data['result'], dict) and 'text' in data['result']:
                content = data['result']['text']
                print("Extracted from result.text field")
        
        # If we found content, write it to the output file
        if content:
            with open(output_file, 'w') as f:
                f.write(content)
            print(f"Successfully extracted content ({len(content)} bytes) to {output_file}")
            sys.exit(0)
        else:
            print("Could not extract content from standard JSON formats")
            
            # If we couldn't extract using standard paths, create a debug dump
            with open(output_file, 'w') as f:
                f.write("# API Response Debug\n\n")
                f.write("The content could not be automatically extracted from the API response.\n\n")
                f.write("## Raw JSON Response\n\n")
                f.write("```json\n")
                f.write(json.dumps(data, indent=2))
                f.write("\n```\n\n")
                f.write("## Available Keys\n\n")
                f.write("Root level keys: " + ", ".join(data.keys()) + "\n\n")
                
                # Try to provide some helpful info about nested structures
                for key in data.keys():
                    if isinstance(data[key], dict):
                        f.write(f"Keys in '{key}': " + ", ".join(data[key].keys()) + "\n")
                    elif isinstance(data[key], list) and len(data[key]) > 0:
                        if isinstance(data[key][0], dict):
                            f.write(f"First item in '{key}' list has keys: " + ", ".join(data[key][0].keys()) + "\n")
            
            sys.exit(1)
                
    except json.JSONDecodeError as e:
        print(f"Failed to parse as JSON: {str(e)}")
        
        # Check if it could be a different format (e.g., streaming newline-delimited JSON)
        if "\n" in raw_content:
            lines = raw_content.strip().split("\n")
            jsonl_items = []
            
            for line in lines:
                if line.strip():
                    try:
                        item = json.loads(line)
                        jsonl_items.append(item)
                    except:
                        pass
            
            if jsonl_items:
                print(f"Parsed as newline-delimited JSON: {len(jsonl_items)} items")
                
                # Extract content from JSONL format
                content_parts = []
                for item in jsonl_items:
                    if 'choices' in item and len(item['choices']) > 0:
                        if 'delta' in item['choices'][0] and 'content' in item['choices'][0]['delta']:
                            content_parts.append(item['choices'][0]['delta']['content'])
                        elif 'text' in item['choices'][0]:
                            content_parts.append(item['choices'][0]['text'])
                    elif 'content' in item:
                        if isinstance(item['content'], list):
                            for content_item in item['content']:
                                if 'text' in content_item:
                                    content_parts.append(content_item['text'])
                        else:
                            content_parts.append(item['content'])
                
                if content_parts:
                    content = ''.join(content_parts)
                    with open(output_file, 'w') as f:
                        f.write(content)
                    print(f"Successfully extracted content from JSONL ({len(content)} bytes)")
                    sys.exit(0)
        
        # If it looks like Markdown, save directly
        if '# ' in raw_content or '## ' in raw_content:
            with open(output_file, 'w') as f:
                f.write(raw_content)
            print(f"Content appears to be Markdown, saved directly ({len(raw_content)} bytes)")
            sys.exit(0)
            
        # Last resort: try to find content between quotes if it looks like JSON
        json_content_pattern = r'"content":\s*"([^"]*)"'
        matches = re.findall(json_content_pattern, raw_content)
        if matches:
            content = matches[0]
            with open(output_file, 'w') as f:
                f.write(content)
            print(f"Extracted content using regex ({len(content)} bytes)")
            sys.exit(0)
        
        # If all else fails, save raw content with note
        with open(output_file, 'w') as f:
            f.write("# Raw API Response\n\n")
            f.write("The system couldn't parse the API response format.\n\n")
            f.write("```\n")
            f.write(raw_content)
            f.write("\n```\n")
        print("Saved raw content with parsing failure notice")
        sys.exit(1)
        
except Exception as e:
    print(f"Error processing file: {str(e)}")
    with open(output_file, 'w') as f:
        f.write(f"# Error Processing API Response\n\n")
        f.write(f"An error occurred: {str(e)}")
    sys.exit(1)
