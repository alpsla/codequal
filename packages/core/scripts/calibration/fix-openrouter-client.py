#!/usr/bin/env python3

"""
Fix OpenRouter Client for DeepWiki
This script fixes the OpenRouter client in DeepWiki to handle model name formats correctly
"""

import sys
import os
import argparse

# Define the Python code to add
PATCH_CODE = """
    def ensure_model_prefix(self, model_name):
        \"\"\"Ensure the model name has the provider prefix.\"\"\"
        if not model_name:
            return "openai/gpt-3.5-turbo"
        
        # If the model name already has a prefix (contains "/"), return it unchanged
        if "/" in model_name:
            return model_name
        
        # Default to OpenAI prefix
        return f"openai/{model_name}"
"""

def apply_patch(file_path):
    """Apply the patch to the OpenRouter client file"""
    print(f"Applying patch to: {file_path}")
    
    try:
        # Read the file
        with open(file_path, 'r') as file:
            content = file.read()
        
        # Create a backup
        with open(f"{file_path}.bak", 'w') as file:
            file.write(content)
        
        # Check if the patch is already applied
        if "def ensure_model_prefix" in content:
            print("Patch already applied. Skipping.")
            return True
        
        # Find the appropriate place to add the patch (before convert_inputs_to_api_kwargs)
        patched_content = content.replace(
            "    def convert_inputs_to_api_kwargs",
            f"{PATCH_CODE}\n    def convert_inputs_to_api_kwargs"
        )
        
        # Update the model name handling in the convert_inputs_to_api_kwargs method
        patched_content = patched_content.replace(
            "            # Ensure model is specified\n"
            "            if \"model\" not in api_kwargs:\n"
            "                api_kwargs[\"model\"] = \"openai/gpt-3.5-turbo\"",
            
            "            # Ensure model is specified and has proper prefix\n"
            "            if \"model\" not in api_kwargs:\n"
            "                api_kwargs[\"model\"] = \"openai/gpt-3.5-turbo\"\n"
            "            else:\n"
            "                api_kwargs[\"model\"] = self.ensure_model_prefix(api_kwargs[\"model\"])"
        )
        
        # Write the patched file
        with open(file_path, 'w') as file:
            file.write(patched_content)
        
        print("Patch applied successfully.")
        return True
    
    except Exception as e:
        print(f"Error applying patch: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Fix OpenRouter client for DeepWiki")
    parser.add_argument("file_path", help="Path to the OpenRouter client Python file")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.file_path):
        print(f"Error: File not found at {args.file_path}")
        return 1
    
    if apply_patch(args.file_path):
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())