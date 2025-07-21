#!/usr/bin/env python3

import sys

if len(sys.argv) < 2:
    print("Usage: python3 fix-google-module.py <file_path>")
    sys.exit(1)

file_path = sys.argv[1]

print(f"Reading file: {file_path}")

with open(file_path, 'r') as f:
    code = f.read()

# Add our helper function
helper_function = """
def extract_base_model_name(model_name):
    '''Extract the base model name without provider prefix.'''
    if not model_name:
        return "gemini-pro"
    
    # If the model contains a provider prefix (e.g., 'openai/gpt-4'),
    # extract just the model part after the '/'
    if "/" in model_name:
        return model_name.split("/", 1)[1]
    
    return model_name
"""

if "def extract_base_model_name(" not in code:
    # Add the helper function after imports section
    import_section_end = code.find("from api.config import get_model_config") + len("from api.config import get_model_config")
    modified_code = code[:import_section_end] + "\n" + helper_function + code[import_section_end:]
    
    # Now fix the Google model initialization
    modified_code = modified_code.replace(
        "model = genai.GenerativeModel(\n                model_name=model_config[\"model\"],",
        "base_model_name = extract_base_model_name(model_config[\"model\"])\n            model = genai.GenerativeModel(\n                model_name=base_model_name,"
    )
    
    # Fix the fallback model initialization
    modified_code = modified_code.replace(
        "fallback_model = genai.GenerativeModel(\n                                model_name=model_config[\"model\"],",
        "base_model_name = extract_base_model_name(model_config[\"model\"])\n                            fallback_model = genai.GenerativeModel(\n                                model_name=base_model_name,"
    )
    
    print("Writing modified file...")
    with open(file_path, 'w') as f:
        f.write(modified_code)
    
    print("Fixed the Google module initialization!")
else:
    print("The fix has already been applied.")
