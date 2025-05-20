#!/usr/bin/env python3

"""
Fix Google Generative AI Model Initialization
This script fixes the issue with model name format when using Google Generative AI
"""

import sys
import os

def fix_google_model(file_path):
    """Fix the Google model initialization to handle OpenRouter model formats"""
    print(f"Fixing Google model initialization in {file_path}")
    
    try:
        # Read the file
        with open(file_path, 'r') as file:
            content = file.read()
        
        # Create a backup
        with open(f"{file_path}.google.bak", 'w') as file:
            file.write(content)
        
        # Add a helper function to extract base model name without provider prefix
        helper_function = """
def extract_base_model_name(model_name):
    \"\"\"Extract the base model name without provider prefix.\"\"\"
    if not model_name:
        return "gemini-pro"
    
    # If the model name contains a provider prefix (e.g., 'openai/gpt-4'),
    # extract just the model part after the '/'
    if "/" in model_name:
        return model_name.split("/", 1)[1]
    
    return model_name

"""
        
        # Add the helper function after the imports
        modified_content = content.replace(
            "from api.config import get_model_config",
            "from api.config import get_model_config\n" + helper_function
        )
        
        # Update the Google model initialization to use the helper function
        modified_content = modified_content.replace(
            "            # Initialize Google Generative AI model\n"
            "            model = genai.GenerativeModel(\n"
            "                model_name=model_config[\"model\"],",
            
            "            # Initialize Google Generative AI model\n"
            "            # Extract base model name without provider prefix for Google AI\n"
            "            base_model_name = extract_base_model_name(model_config[\"model\"])\n"
            "            model = genai.GenerativeModel(\n"
            "                model_name=base_model_name,"
        )
        
        # Also update the fallback initialization
        modified_content = modified_content.replace(
            "                            # Initialize Google Generative AI model\n"
            "                            model_config = get_model_config(request.provider, request.model)\n"
            "                            fallback_model = genai.GenerativeModel(\n"
            "                                model_name=model_config[\"model\"],",
            
            "                            # Initialize Google Generative AI model\n"
            "                            model_config = get_model_config(request.provider, request.model)\n"
            "                            # Extract base model name without provider prefix for Google AI\n"
            "                            base_model_name = extract_base_model_name(model_config[\"model\"])\n"
            "                            fallback_model = genai.GenerativeModel(\n"
            "                                model_name=base_model_name,"
        )
        
        # Write the modified file
        with open(file_path, 'w') as file:
            file.write(modified_content)
        
        print("Google model initialization fixed successfully.")
        return True
    
    except Exception as e:
        print(f"Error fixing Google model initialization: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python fix-google-model.py <simple_chat.py_path>")
        return 1
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return 1
    
    if fix_google_model(file_path):
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())