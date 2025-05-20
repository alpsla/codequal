#!/usr/bin/env python3

"""
Final OpenRouter integration fix script
This script fixes all the integration issues with OpenRouter in DeepWiki
"""

import sys
import os
import time

# Get the file path from the command line argument
if len(sys.argv) != 2:
    print("Usage: python3 final-fix.py <simple_chat.py_path>")
    sys.exit(1)

chat_file_path = sys.argv[1]

print(f"Reading file: {chat_file_path}")

# Make sure the file exists
if not os.path.exists(chat_file_path):
    print(f"Error: File not found: {chat_file_path}")
    sys.exit(1)

# Read the file
with open(chat_file_path, 'r') as file:
    content = file.read()

# Create a backup
backup_path = f"{chat_file_path}.final.bak"
with open(backup_path, 'w') as file:
    file.write(content)
print(f"Created backup at: {backup_path}")

# Add our helper function to extract model names from provider prefixed format
extract_function = """

# Helper function to extract model name from provider/model format
def extract_base_model_name(model_name):
    '''Extract the base model name without provider prefix.'''
    if not model_name:
        return "gemini-pro"  # Default for Google
    
    # If the model name contains a provider prefix (e.g., 'openai/gpt-4'),
    # extract just the model part after the '/'
    if "/" in model_name:
        return model_name.split("/", 1)[1]
    
    return model_name

"""

# Add the function after the imports
if "def extract_base_model_name(" not in content:
    modified_content = content.replace(
        "from api.config import get_model_config",
        f"from api.config import get_model_config{extract_function}"
    )
    
    print("Added extract_base_model_name function")
else:
    modified_content = content
    print("extract_base_model_name function already exists")

# Fix Google model initialization - all instances
if "base_model_name = extract_base_model_name(" not in modified_content:
    # Fix Google Generative AI model initialization
    modified_content = modified_content.replace(
        """            # Initialize Google Generative AI model
            model = genai.GenerativeModel(
                model_name=model_config["model"],""",
        
        """            # Initialize Google Generative AI model
            # Extract base model name without provider prefix for Google AI
            base_model_name = extract_base_model_name(model_config["model"])
            model = genai.GenerativeModel(
                model_name=base_model_name,"""
    )
    
    # Fix the fallback model initialization
    modified_content = modified_content.replace(
        """                            # Initialize Google Generative AI model
                            model_config = get_model_config(request.provider, request.model)
                            fallback_model = genai.GenerativeModel(
                                model_name=model_config["model"],""",
        
        """                            # Initialize Google Generative AI model
                            model_config = get_model_config(request.provider, request.model)
                            # Extract base model name without provider prefix
                            base_model_name = extract_base_model_name(model_config["model"])
                            fallback_model = genai.GenerativeModel(
                                model_name=base_model_name,"""
    )
    
    print("Fixed Google Generative AI model initialization")
else:
    print("Google model initialization already fixed")

# Make sure we handle any model that needs this fix
# Find the provider check block
provider_check = """        if request.provider == "ollama":
            # Get the response and handle it properly using the previously created api_kwargs
            response = await model.acall(api_kwargs=api_kwargs, model_type=ModelType.LLM)"""

# Add a debug info block to log what model we're using
provider_check_replacement = """        # Log provider and model information
        logger.info(f"Using provider: {request.provider}, model: {request.model}")
        
        if request.provider == "ollama":
            # Get the response and handle it properly using the previously created api_kwargs
            response = await model.acall(api_kwargs=api_kwargs, model_type=ModelType.LLM)"""

if "# Log provider and model information" not in modified_content:
    modified_content = modified_content.replace(provider_check, provider_check_replacement)
    print("Added model debug logging")
else:
    print("Model debug logging already added")

# Write the modified file
with open(chat_file_path, 'w') as file:
    file.write(modified_content)

print("All fixes applied successfully!")
print("Please restart the DeepWiki pod to apply the changes.")