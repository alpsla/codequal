#!/usr/bin/env python3

"""
Disable Google GenerativeAI fallback in the DeepWiki streaming code
"""

import sys
import re

if len(sys.argv) < 2:
    print("Usage: python3 disable-google-fallback.py <file_path>")
    sys.exit(1)

file_path = sys.argv[1]

print(f"Reading file: {file_path}")

with open(file_path, 'r') as f:
    code = f.read()

# Find the section with the fallback to Google Generative AI
google_fallback_pattern = r"""except Exception as e2:
                        try:
                            logger\.error\(f"Falling back to Google Generative AI: {str\(e2\)}"\)
                            # Initialize Google Generative AI model.+?
                            # Stream the fallback response.+?
                        except Exception as e2:"""

# Replace with a version that doesn't use Google fallback
replacement = """except Exception as e2:
                        try:
                            logger.error(f"Error in streaming response: {str(e2)}")
                            yield f"\\nError: {str(e2)}"
                        except Exception as e3:"""

modified_code = re.sub(google_fallback_pattern, replacement, code, flags=re.DOTALL)

if modified_code != code:
    print("Writing modified file...")
    with open(file_path, 'w') as f:
        f.write(modified_code)
    
    print("Disabled Google Generative AI fallback!")
else:
    print("No changes were made. Pattern not found or already replaced.")