#!/usr/bin/env python3
"""
Patch for OpenRouter client to handle model name prefixes correctly.
"""
import os
import re

# OpenRouter client file
CLIENT_FILE = "/app/api/openrouter_client.py"

# Backup the original file
os.system(f"cp {CLIENT_FILE} {CLIENT_FILE}.bak")
print(f"Created backup at {CLIENT_FILE}.bak")

# Read the current content
with open(CLIENT_FILE, 'r') as f:
    content = f.read()

# Add ensure_model_prefix method
if "ensure_model_prefix" not in content:
    # Find the class definition
    class_pattern = r"class OpenRouterClient.*?:"
    class_match = re.search(class_pattern, content)
    
    if class_match:
        class_end = class_match.end()
        
        # Method to add
        ensure_prefix_method = """
    def ensure_model_prefix(self, model_name):
        """
        Ensures the model name has a provider prefix.
        If no prefix exists, it defaults to 'openai/' prefix.
        """
        if '/' not in model_name:
            return f"openai/{model_name}"
        return model_name
"""
        
        # Insert method at the end of class definition
        new_content = content[:class_end] + ensure_prefix_method + content[class_end:]
        content = new_content
        
        print(f"Added ensure_model_prefix method to OpenRouterClient")
    else:
        print(f"❌ Could not find OpenRouterClient class definition")
else:
    print(f"ℹ️ ensure_model_prefix method already exists in {CLIENT_FILE}")

# Update the generate method to use ensure_model_prefix
if "self.ensure_model_prefix" not in content:
    # Look for the model parameter in a request
    model_pattern = r'(\s*)"model": ?(model_name|\w+),'
    model_match = re.search(model_pattern, content)
    
    if model_match:
        indentation = model_match.group(1)
        param_name = model_match.group(2)
        old_line = model_match.group(0)
        new_line = f'{indentation}"model": self.ensure_model_prefix({param_name}),'
        
        new_content = content.replace(old_line, new_line)
        
        # Write the updated content
        with open(CLIENT_FILE, 'w') as f:
            f.write(new_content)
        
        print(f"✅ Updated generate method to use ensure_model_prefix")
    else:
        print(f"❌ Could not find model assignment in generate method")
        
        # Try to find the model parameter in a payload or data dictionary
        payload_pattern = r'(\s*)(payload|data)\["model"\] ?= ?(?P<param>\w+)'
        payload_match = re.search(payload_pattern, content)
        
        if payload_match:
            indentation = payload_match.group(1)
            dict_name = payload_match.group(2)
            param_name = payload_match.group('param')
            old_line = payload_match.group(0)
            new_line = f'{indentation}{dict_name}["model"] = self.ensure_model_prefix({param_name})'
            
            new_content = content.replace(old_line, new_line)
            
            # Write the updated content
            with open(CLIENT_FILE, 'w') as f:
                f.write(new_content)
            
            print(f"✅ Updated {dict_name}['model'] assignment to use ensure_model_prefix")
        else:
            print(f"❌ Could not find any model assignment in {CLIENT_FILE}")
else:
    print(f"ℹ️ self.ensure_model_prefix is already used in {CLIENT_FILE}")
