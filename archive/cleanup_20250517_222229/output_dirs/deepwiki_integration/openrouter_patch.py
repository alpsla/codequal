#!/usr/bin/env python3
"""
Patch for OpenRouter client to handle model name prefixes correctly.
"""
import os
import re
import sys

# OpenRouter client file
CLIENT_FILE = "/app/api/openrouter_client.py"

# Backup the original file
os.system(f"cp {CLIENT_FILE} {CLIENT_FILE}.bak")
print(f"Created backup at {CLIENT_FILE}.bak")

# Read the current content
with open(CLIENT_FILE, 'r') as f:
    content = f.read()

# Check if methods need to be added
add_ensure_model_prefix = "ensure_model_prefix" not in content
modify_generate_method = "self.ensure_model_prefix" not in content

if add_ensure_model_prefix:
    # Find the best place to add the method
    # Try to find the class definition
    class_def_pattern = r"class OpenRouterClient\(ModelClient\):"
    class_match = re.search(class_def_pattern, content)
    
    if not class_match:
        print("ERROR: Could not find OpenRouterClient class definition")
        sys.exit(1)
    
    # Find a good method to add after - like init_sync_client or __init__
    method_pattern = r"def init_sync_client\(self\):"
    method_match = re.search(method_pattern, content)
    
    if not method_match:
        # Try to find __init__ method
        init_pattern = r"def __init__\(self, \*args, \*\*kwargs\) -> None:"
        init_match = re.search(init_pattern, content)
        
        if not init_match:
            print("ERROR: Could not find a suitable method to add after")
            sys.exit(1)
        
        method_match = init_match
    
    # Find the end of the method
    method_start = method_match.start()
    next_def_pattern = r"def"
    next_def_match = re.search(next_def_pattern, content[method_start+10:])
    
    if not next_def_match:
        print("ERROR: Could not find the end of the method")
        sys.exit(1)
    
    insert_point = method_start + 10 + next_def_match.start()
    
    # Method to add (using docstring with single quotes to avoid indentation issues)
    ensure_prefix_method = """
    def ensure_model_prefix(self, model_name):
        '''
        Ensures the model name has a provider prefix.
        If no prefix exists, it defaults to 'openai/' prefix.
        '''
        if not model_name:
            return "openai/gpt-3.5-turbo"
        if '/' not in model_name:
            return f"openai/{model_name}"
        return model_name

    """
    
    # Insert the method
    new_content = content[:insert_point] + ensure_prefix_method + content[insert_point:]
    content = new_content
    print("Added ensure_model_prefix method to OpenRouterClient")

# Now look for the generate method or any method that sends requests
if modify_generate_method:
    # Look for generate method
    generate_pattern = r"def generate\(self.*?\):"
    generate_match = re.search(generate_pattern, content)
    
    if generate_match:
        # Find where the model parameter is used in the request
        model_pattern = r'("model"): ?([^,\n]+),'
        model_matches = list(re.finditer(model_pattern, content))
        
        if model_matches:
            # Replace each occurrence
            modified_content = content
            for match in reversed(model_matches):  # Process in reverse to avoid changing positions
                full_match = match.group(0)
                model_key = match.group(1)
                model_param = match.group(2).strip()
                
                # Only replace if it's not already using ensure_model_prefix
                if "ensure_model_prefix" not in full_match:
                    new_text = f'{model_key}: self.ensure_model_prefix({model_param}),'
                    modified_content = modified_content[:match.start()] + new_text + modified_content[match.end():]
            
            content = modified_content
            print("Updated model references to use ensure_model_prefix")
        else:
            print("Could not find model parameter in generate method")
    
    # Also look for completions or chat completions methods
    completions_pattern = r"def (?:completions|chat_completions|completion|chat_completion)\(self.*?\):"
    completions_matches = list(re.finditer(completions_pattern, content))
    
    if completions_matches:
        # Find where the model parameter is used in these methods
        modified_content = content
        for match in completions_matches:
            method_start = match.start()
            
            # Find the next method
            next_method = re.search(r"def ", content[method_start + 4:])
            method_end = len(content) if not next_method else method_start + 4 + next_method.start()
            
            method_content = content[method_start:method_end]
            
            # Find model parameter in this method
            model_pattern = r'("model"): ?([^,\n]+),'
            model_matches = list(re.finditer(model_pattern, method_content))
            
            if model_matches:
                for m in reversed(model_matches):
                    full_match = m.group(0)
                    model_key = m.group(1)
                    model_param = m.group(2).strip()
                    
                    if "ensure_model_prefix" not in full_match:
                        new_text = f'{model_key}: self.ensure_model_prefix({model_param}),'
                        absolute_start = method_start + m.start()
                        absolute_end = method_start + m.end()
                        modified_content = modified_content[:absolute_start] + new_text + modified_content[absolute_end:]
        
        content = modified_content
        print("Updated completions methods to use ensure_model_prefix")

# Look for any payload or data dictionaries with model
payload_pattern = r'(\s*)(payload|data|request|body|params)\["model"\] ?= ?([^;\n]+)'
payload_matches = list(re.finditer(payload_pattern, content))

if payload_matches:
    modified_content = content
    for match in reversed(payload_matches):
        indentation = match.group(1)
        dict_name = match.group(2)
        param_name = match.group(3).strip()
        
        if "ensure_model_prefix" not in param_name:
            new_line = f'{indentation}{dict_name}["model"] = self.ensure_model_prefix({param_name})'
            modified_content = modified_content[:match.start()] + new_line + modified_content[match.end():]
    
    content = modified_content
    print(f"Updated dictionary model assignments to use ensure_model_prefix")

# Write the updated content
with open(CLIENT_FILE, 'w') as f:
    f.write(content)

print(f"✅ Successfully patched {CLIENT_FILE}")
