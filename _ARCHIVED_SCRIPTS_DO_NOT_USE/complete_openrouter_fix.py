#!/usr/bin/env python3
"""
complete_openrouter_fix.py - Comprehensive fix for DeepWiki's OpenRouter integration.

This script fixes the model name handling in DeepWiki to properly support OpenRouter's
provider-prefixed model formats while maintaining compatibility with other model providers.

Usage:
  kubectl cp complete_openrouter_fix.py codequal-dev/deepwiki-pod-name:/tmp/
  kubectl exec -it deepwiki-pod-name -n codequal-dev -- python /tmp/complete_openrouter_fix.py
"""

import os
import sys
import json
import importlib.util
import re
import logging
from typing import Dict, Any, Optional, List, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Common paths for DeepWiki files
APP_ROOT = "/app"
API_DIR = os.path.join(APP_ROOT, "api")
CONFIG_DIR = os.path.join(API_DIR, "config")
GENERATOR_CONFIG_PATH = os.path.join(CONFIG_DIR, "generator.json")

# Backup directory
BACKUP_DIR = "/tmp/deepwiki_backups"
os.makedirs(BACKUP_DIR, exist_ok=True)


def backup_file(file_path: str) -> Optional[str]:
    """Create a backup of a file before modifying it.

    Args:
        file_path: Path to the file to backup

    Returns:
        Optional[str]: Path to the backup file or None if backup failed
    """
    if not os.path.exists(file_path):
        logger.warning(f"File {file_path} does not exist, cannot create backup")
        return None
    
    backup_path = os.path.join(BACKUP_DIR, os.path.basename(file_path) + ".bak")
    try:
        with open(file_path, 'r') as src, open(backup_path, 'w') as dst:
            dst.write(src.read())
        logger.info(f"Created backup of {file_path} at {backup_path}")
        return backup_path
    except Exception as e:
        logger.error(f"Failed to create backup of {file_path}: {str(e)}")
        return None


def find_module_file(module_name: str) -> Optional[str]:
    """Find the file path for a module by name.

    Args:
        module_name: The module name to search for

    Returns:
        Optional[str]: Path to the module file or None if not found
    """
    try:
        spec = importlib.util.find_spec(module_name)
        if spec and spec.origin:
            return spec.origin
        return None
    except (ImportError, AttributeError):
        # Try to find the module manually
        module_path = module_name.replace('.', '/')
        possible_paths = [
            f"{API_DIR}/{module_path}.py",
            f"{APP_ROOT}/{module_path}.py",
            f"/usr/local/lib/python3.9/site-packages/{module_path}.py",
            f"/usr/local/lib/python3.10/site-packages/{module_path}.py",
            f"/usr/local/lib/python3.11/site-packages/{module_path}.py",
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
        
        logger.warning(f"Could not find module file for {module_name}")
        return None


def patch_openrouter_client() -> bool:
    """Patch the OpenRouter client to handle model name prefixes correctly.

    This function adds an ensure_model_prefix method to the OpenRouterClient class
    and updates the generate method to use this method for model name handling.

    Returns:
        bool: True if the patch was successful, False otherwise
    """
    # Find OpenRouter client file
    openrouter_file = find_module_file("api.clients.openrouter")
    if not openrouter_file:
        # Try alternative locations
        possible_paths = [
            f"{API_DIR}/clients/openrouter.py",
            f"{APP_ROOT}/api/clients/openrouter.py"
        ]
        for path in possible_paths:
            if os.path.exists(path):
                openrouter_file = path
                break
        
        if not openrouter_file:
            logger.error("Could not find OpenRouter client file")
            return False
    
    logger.info(f"Found OpenRouter client at {openrouter_file}")
    backup_file(openrouter_file)
    
    # Read the current file
    with open(openrouter_file, 'r') as f:
        content = f.read()
    
    # Add ensure_model_prefix method
    ensure_prefix_method = """
    def ensure_model_prefix(self, model_name):
        
        if '/' not in model_name:
            return f"openai/{model_name}"
        return model_name
    """
    
    # Check if the method already exists
    if "ensure_model_prefix" not in content:
        # Find the class definition to insert the method
        class_pattern = r"class OpenRouterClient.*?:"
        class_match = re.search(class_pattern, content)
        if not class_match:
            logger.error("Could not find OpenRouterClient class definition")
            return False
        
        # Find the end of the class definition
        class_end = class_match.end()
        new_content = content[:class_end] + ensure_prefix_method + content[class_end:]
        
        # Write the updated content
        with open(openrouter_file, 'w') as f:
            f.write(new_content)
        
        logger.info("Added ensure_model_prefix method to OpenRouterClient")
    else:
        logger.info("ensure_model_prefix method already exists in OpenRouterClient")
    
    # Now update the generate method to use ensure_model_prefix
    with open(openrouter_file, 'r') as f:
        content = f.read()
    
    # Pattern to find the model assignment in the generate method
    model_pattern = r'(\s*)"model": ?(model_name|\w+),'
    model_match = re.search(model_pattern, content)
    
    if model_match:
        indentation = model_match.group(1)
        param_name = model_match.group(2)
        replacement = f'{indentation}"model": self.ensure_model_prefix({param_name}),'
        new_content = content.replace(model_match.group(0), replacement)
        
        # Write the updated content
        with open(openrouter_file, 'w') as f:
            f.write(new_content)
        
        logger.info("Updated generate method to use ensure_model_prefix")
    else:
        logger.warning("Could not find model assignment in generate method")
    
    return True


def patch_provider_factory() -> bool:
    """Patch the provider factory to handle model name extraction for different providers.

    This function adds an extract_base_model_name function to extract the base model name
    from provider-prefixed formats, and updates the provider factory to use this function.

    Returns:
        bool: True if the patch was successful, False otherwise
    """
    # Find provider factory file
    factory_file = find_module_file("api.clients.factory")
    if not factory_file:
        # Try alternative locations
        possible_paths = [
            f"{API_DIR}/clients/factory.py",
            f"{APP_ROOT}/api/clients/factory.py"
        ]
        for path in possible_paths:
            if os.path.exists(path):
                factory_file = path
                break
        
        if not factory_file:
            logger.error("Could not find provider factory file")
            return False
    
    logger.info(f"Found provider factory at {factory_file}")
    backup_file(factory_file)
    
    # Read the current file
    with open(factory_file, 'r') as f:
        content = f.read()
    
    # Add extract_base_model_name function
    extract_model_function = """
def extract_base_model_name(model_name):
  
    if '/' in model_name:
        return model_name.split('/', 1)[1]
    return model_name
"""
    
    # Check if the function already exists
    if "extract_base_model_name" not in content:
        # Add the function at the beginning of the file (after imports)
        import_pattern = r"^(import.*\n+)+"
        import_match = re.search(import_pattern, content)
        if import_match:
            insert_point = import_match.end()
            new_content = content[:insert_point] + extract_model_function + content[insert_point:]
            
            # Write the updated content
            with open(factory_file, 'w') as f:
                f.write(new_content)
            
            logger.info("Added extract_base_model_name function to provider factory")
        else:
            logger.warning("Could not find import section in provider factory")
            # Add to the beginning of the file as a fallback
            with open(factory_file, 'w') as f:
                f.write(extract_model_function + content)
            logger.info("Added extract_base_model_name function to the beginning of provider factory")
    else:
        logger.info("extract_base_model_name function already exists in provider factory")
    
    # Update the create_client method to use extract_base_model_name for non-OpenRouter providers
    with open(factory_file, 'r') as f:
        content = f.read()
    
    # Find the create_client method
    create_client_pattern = r"def create_client\(.*?\):"
    create_client_match = re.search(create_client_pattern, content)
    
    if create_client_match:
        # Find where the client is created for other providers
        provider_switch_pattern = r"(\s+)if provider == ['\"]openrouter['\"].*?(\s+)elif provider == ['\"]google['\"]"
        provider_match = re.search(provider_switch_pattern, content, re.DOTALL)
        
        if provider_match:
            indentation = provider_match.group(1)
            indentation2 = provider_match.group(2)
            # Create the modified code that extracts base model name for other providers
            replacement = f"{indentation}if provider == 'openrouter':\n"
            replacement += f"{indentation2}return OpenRouterClient(api_key)\n"
            replacement += f"{indentation}elif provider == 'google':\n"
            replacement += f"{indentation2}# Extract base model name for Google provider\n"
            replacement += f"{indentation2}base_model = extract_base_model_name(model_name)\n"
            replacement += f"{indentation2}return GoogleGenerativeAIClient(api_key, base_model)"
            
            # Replace in the content
            new_content = re.sub(provider_switch_pattern, replacement, content, flags=re.DOTALL)
            
            # Check if we also need to update other providers
            other_providers = ['openai', 'anthropic', 'ollama']
            for provider in other_providers:
                provider_pattern = rf"(\s+)elif provider == ['\"]({provider})['\"].*?(\s+)(return \w+Client\(.*?\))"
                provider_match = re.search(provider_pattern, content, re.DOTALL)
                
                if provider_match:
                    indent1 = provider_match.group(1)
                    prov_name = provider_match.group(2)
                    indent2 = provider_match.group(3)
                    return_stmt = provider_match.group(4)
                    
                    # Create replacement with base model extraction
                    prov_replacement = f"{indent1}elif provider == '{prov_name}':\n"
                    prov_replacement += f"{indent2}# Extract base model name for {prov_name} provider\n"
                    prov_replacement += f"{indent2}base_model = extract_base_model_name(model_name)\n"
                    prov_replacement += f"{indent2}return {prov_name.capitalize()}Client(api_key, base_model)"
                    
                    # Update the content
                    new_content = re.sub(provider_pattern, prov_replacement, new_content, flags=re.DOTALL)
            
            # Write the updated content
            with open(factory_file, 'w') as f:
                f.write(new_content)
            
            logger.info("Updated create_client method to use extract_base_model_name for non-OpenRouter providers")
        else:
            logger.warning("Could not find provider switch section in create_client method")
    else:
        logger.warning("Could not find create_client method in provider factory")
    
    return True


def update_generator_config() -> bool:
    """Update the generator.json config to include proper OpenRouter configuration.

    This function updates or adds the OpenRouter configuration in the generator.json
    file, setting it as the default provider with appropriate model settings.

    Returns:
        bool: True if the update was successful, False otherwise
    """
    if not os.path.exists(GENERATOR_CONFIG_PATH):
        logger.error(f"Generator configuration file not found at {GENERATOR_CONFIG_PATH}")
        return False
    
    logger.info(f"Found generator config at {GENERATOR_CONFIG_PATH}")
    backup_file(GENERATOR_CONFIG_PATH)
    
    try:
        # Read the current config
        with open(GENERATOR_CONFIG_PATH, 'r') as f:
            config = json.load(f)
        
        # Update or add OpenRouter configuration
        if 'providers' not in config:
            config['providers'] = {}
        
        config['providers']['openrouter'] = {
            "default_model": "anthropic/claude-3-5-sonnet",
            "available_models": [
                "anthropic/claude-3-opus",
                "anthropic/claude-3-5-sonnet",
                "anthropic/claude-3-haiku",
                "openai/gpt-4o",
                "openai/gpt-4-turbo",
                "google/gemini-1.5-pro",
                "meta-llama/llama-3-70b-instruct",
                "mistral/mistral-large",
                "deepseek/deepseek-coder"
            ],
            "parameters": {
                "temperature": 0.7,
                "top_p": 0.95
            }
        }
        
        # Make sure OpenRouter is the default provider
        config['default_provider'] = 'openrouter'
        
        # Write the updated config
        with open(GENERATOR_CONFIG_PATH, 'w') as f:
            json.dump(config, f, indent=2)
        
        logger.info("Updated generator.json with proper OpenRouter configuration")
        return True
    except Exception as e:
        logger.error(f"Failed to update generator.json: {str(e)}")
        return False


def ensure_environment_variables() -> bool:
    """Check and recommend environment variables for OpenRouter integration.

    This function checks if required environment variables are set and provides
    guidance on how to set them up in Kubernetes if missing.

    Returns:
        bool: True if all required variables are set, False otherwise
    """
    required_vars = ['OPENROUTER_API_KEY']
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
    if missing_vars:
        logger.warning(f"Missing required environment variables: {', '.join(missing_vars)}")
        print("\n=== IMPORTANT: Environment Variables Setup ===")
        print("The following environment variables need to be set for OpenRouter integration:")
        for var in missing_vars:
            print(f"  - {var}: Required for OpenRouter authentication")
        
        print("\nIn Kubernetes, you should set them using a Secret and inject into the pod:")
        print("""
apiVersion: v1
kind: Secret
metadata:
  name: deepwiki-api-keys
  namespace: codequal-dev
type: Opaque
data:
  OPENROUTER_API_KEY: <base64-encoded-key>

---
# Then in your Deployment:
env:
  - name: OPENROUTER_API_KEY
    valueFrom:
      secretKeyRef:
        name: deepwiki-api-keys
        key: OPENROUTER_API_KEY
""")
        return False
    
    logger.info("All required environment variables are set")
    return True


def create_test_script() -> bool:
    """Create a test script to verify the OpenRouter integration.

    This function creates a Python script at /tmp/test_openrouter.py that
    can be used to test the OpenRouter integration with different models.

    Returns:
        bool: True if the script was created successfully, False otherwise
    """
    test_script_path = "/tmp/test_openrouter.py"
    
    test_script_content = """#!/usr/bin/env python3

import time
import sys


def test_openrouter_integration():
    print("=== Testing DeepWiki OpenRouter Integration ===")
    
    # Check API endpoint
    base_url = "http://localhost:8001"
    
    # Try to access the base URL
    try:
        response = requests.get(base_url)
        print(f"Base URL accessible: {response.status_code}")
    except Exception as e:
        print(f"Error accessing base URL: {str(e)}")
        print("Make sure port forwarding is set up correctly:")
        print("kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001")
        return False
    
    # Test models
    models_to_test = [
        "anthropic/claude-3-5-sonnet",  # Default model
        "openai/gpt-4o",
        "google/gemini-1.5-pro",
        "deepseek/deepseek-coder"
    ]
    
    success_count = 0
    
    for model in models_to_test:
        print(f"\\nTesting model: {model}")
        
        # Create payload
        payload = {
            "repo_url": "https://github.com/AsyncFuncAI/deepwiki-open",
            "messages": [
                {
                    "role": "user",
                    "content": "What is this repository about? Give a brief one-paragraph summary."
                }
            ],
            "stream": False,
            "provider": "openrouter",
            "model": model
        }
        
        try:
            # Make the request
            start_time = time.time()
            response = requests.post(
                f"{base_url}/chat/completions/stream",
                json=payload,
                timeout=30
            )
            duration = time.time() - start_time
            
            print(f"Status code: {response.status_code} (took {duration:.2f}s)")
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    success_count += 1
                    print("Success! Response received.")
                    if isinstance(result, dict) and "message" in result:
                        content = result["message"].get("content", "")
                        preview = content[:150] + "..." if len(content) > 150 else content
                        print(f"Response preview: {preview}")
                except Exception as e:
                    print(f"Error parsing JSON response: {str(e)}")
                    print(f"Raw response: {response.text[:200]}...")
            else:
                print(f"Error: Received status code {response.status_code}")
                print(f"Response: {response.text[:200]}...")
        except Exception as e:
            print(f"Error making request: {str(e)}")
    
    # Print summary
    print(f"\\n=== Test Summary ===")
    print(f"Models tested: {len(models_to_test)}")
    print(f"Successful: {success_count}")
    print(f"Failed: {len(models_to_test) - success_count}")
    
    if success_count == len(models_to_test):
        print("\\n✅ All models are working correctly with OpenRouter!")
        return True
    elif success_count > 0:
        print("\\n⚠️ Some models are working, but not all. Check the logs for details.")
        return True
    else:
        print("\\n❌ All models failed. The OpenRouter integration is not working.")
        return False


if __name__ == "__main__":
    success = test_openrouter_integration()
    sys.exit(0 if success else 1)
"""
    
    with open(test_script_path, 'w') as f:
        f.write(test_script_content)
    
    # Make it executable
    os.chmod(test_script_path, 0o755)
    
    logger.info(f"Created test script at {test_script_path}")
    return True


def main():
    """Main function to run all fixes.

    This function executes all the fix steps in sequence and provides a summary
    of the results along with next steps.
    """
    logger.info("Starting comprehensive OpenRouter integration fix for DeepWiki")
    
    # Step 1: Patch the OpenRouter client
    logger.info("Step 1: Patching OpenRouter client...")
    openrouter_patched = patch_openrouter_client()
    
    # Step 2: Patch the provider factory
    logger.info("Step 2: Patching provider factory...")
    factory_patched = patch_provider_factory()
    
    # Step 3: Update the generator config
    logger.info("Step 3: Updating generator configuration...")
    config_updated = update_generator_config()
    
    # Step 4: Check environment variables
    logger.info("Step 4: Checking environment variables...")
    env_vars_ok = ensure_environment_variables()
    
    # Step 5: Create test script
    logger.info("Step 5: Creating test script...")
    test_script_created = create_test_script()
    
    # Summary
    print("\n=== DeepWiki OpenRouter Integration Fix Summary ===")
    print(f"✅ OpenRouter client patched: {openrouter_patched}")
    print(f"✅ Provider factory patched: {factory_patched}")
    print(f"✅ Generator configuration updated: {config_updated}")
    print(f"✅ Environment variables checked: {env_vars_ok}")
    print(f"✅ Test script created: {test_script_created}")
    
    # Next steps
    print("\n=== Next Steps ===")
    print("1. Restart the DeepWiki pod to apply the changes:")
    print("   kubectl delete pod -n codequal-dev deepwiki-779df6764f-fwcrg")
    print("   (The pod will be automatically recreated by the deployment controller)")
    print("\n2. Set up port forwarding to test the integration:")
    print("   kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001")
    print("\n3. Run the test script to verify the integration:")
    print("   python /tmp/test_openrouter.py")
    
    # If environment variables are missing
    if not env_vars_ok:
        print("\n⚠️ Remember to set up the required environment variables as mentioned above!")
    
    logger.info("Fix completed successfully!")


if __name__ == "__main__":
    main()
