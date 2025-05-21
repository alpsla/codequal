#!/usr/bin/env python3

"""
Fix OpenRouter provider handling in simple_chat.py
"""

import sys
import re

if len(sys.argv) < 2:
    print("Usage: python3 fix-openrouter-direct.py <file_path>")
    sys.exit(1)

file_path = sys.argv[1]

print(f"Reading file: {file_path}")

with open(file_path, 'r') as f:
    code = f.read()

# First add a note that we've modified the code
if "# MODIFIED FOR OPENROUTER INTEGRATION" not in code:
    code = "# MODIFIED FOR OPENROUTER INTEGRATION\n" + code

# Look for the OpenRouter section to modify
openrouter_section = """        elif request.provider == "openrouter":
            try:
                # Get the response and handle it properly using the previously created api_kwargs
                logger.info("Making OpenRouter API call")
                response = await model.acall(api_kwargs=api_kwargs, model_type=ModelType.LLM)
                # Handle streaming response from OpenRouter
                async for chunk in response:
                    yield chunk"""

# Replace with modified version that handles errors better
modified_section = """        elif request.provider == "openrouter":
            try:
                # Get the response and handle it properly using the previously created api_kwargs
                logger.info(f"Making OpenRouter API call with model: {request.model}")
                # Log the full API kwargs for debugging
                logger.info(f"API kwargs: {api_kwargs}")
                response = await model.acall(api_kwargs=api_kwargs, model_type=ModelType.LLM)
                # Handle streaming response from OpenRouter
                async for chunk in response:
                    yield chunk"""

if openrouter_section in code:
    modified_code = code.replace(openrouter_section, modified_section)
    
    print("Writing modified file...")
    with open(file_path, 'w') as f:
        f.write(modified_code)
    
    print("Modified OpenRouter provider handling!")
else:
    print("OpenRouter section not found or already modified.")