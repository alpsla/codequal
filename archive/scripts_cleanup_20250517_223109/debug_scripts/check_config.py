#!/usr/bin/env python3
# DeepWiki configuration exploration script

import os
import json
import yaml
import glob
from pprint import pprint

def explore_config_directories():
    """Explore the DeepWiki configuration directories"""
    print("DeepWiki Configuration Explorer")
    print("==============================")
    
    # Common configuration locations
    config_paths = [
        "/root/.adalflow/",
        "/root/.adalflow/config/",
        "/root/.adalflow/providers/",
        "/app/config/",
        "/etc/deepwiki/",
        "/usr/local/etc/deepwiki/",
        "/opt/deepwiki/config/"
    ]
    
    found_configs = []
    
    # Check each path for configuration files
    for path in config_paths:
        print(f"\nChecking path: {path}")
        if os.path.exists(path):
            print(f"✅ Path exists")
            config_files = []
            
            # Look for configuration files
            for ext in ["*.yaml", "*.yml", "*.json", "*.config", "*.env", "*.toml"]:
                config_files.extend(glob.glob(os.path.join(path, ext)))
            
            # Also check for specific files without extensions
            for specific in ["config", "settings", "env", "providers"]:
                specific_path = os.path.join(path, specific)
                if os.path.isfile(specific_path):
                    config_files.append(specific_path)
            
            if config_files:
                print(f"Found {len(config_files)} configuration files:")
                for config_file in config_files:
                    print(f"  - {os.path.basename(config_file)}")
                    found_configs.append(config_file)
            else:
                # Check subdirectories
                subdirs = [d for d in os.listdir(path) if os.path.isdir(os.path.join(path, d))]
                if subdirs:
                    print(f"Found {len(subdirs)} subdirectories:")
                    for subdir in subdirs:
                        print(f"  - {subdir}/")
                        # Look for config files in subdirectory
                        subdir_path = os.path.join(path, subdir)
                        subdir_files = []
                        for ext in ["*.yaml", "*.yml", "*.json", "*.config", "*.env", "*.toml"]:
                            subdir_files.extend(glob.glob(os.path.join(subdir_path, ext)))
                        
                        if subdir_files:
                            print(f"    Found {len(subdir_files)} files:")
                            for file in subdir_files:
                                print(f"    - {os.path.basename(file)}")
                                found_configs.append(file)
                else:
                    print("No configuration files or subdirectories found")
        else:
            print("❌ Path does not exist")
    
    return found_configs

def check_provider_configurations():
    """Check provider-specific configurations"""
    print("\nChecking Provider Configurations")
    print("==============================")
    
    provider_dirs = [
        "/root/.adalflow/providers/",
        "/app/config/providers/",
        "/etc/deepwiki/providers/",
    ]
    
    providers = ["openai", "anthropic", "google", "deepseek"]
    provider_configs = {}
    
    for provider_dir in provider_dirs:
        if os.path.exists(provider_dir):
            print(f"\nChecking provider directory: {provider_dir}")
            
            for provider in providers:
                # Check for provider config files with different extensions
                for ext in ["yaml", "yml", "json"]:
                    config_path = os.path.join(provider_dir, f"{provider}.{ext}")
                    if os.path.exists(config_path):
                        print(f"✅ Found configuration for {provider}: {config_path}")
                        
                        try:
                            # Try to read the configuration
                            if ext in ["yaml", "yml"]:
                                with open(config_path, 'r') as f:
                                    config = yaml.safe_load(f)
                            else:
                                with open(config_path, 'r') as f:
                                    config = json.load(f)
                            
                            provider_configs[provider] = config
                            
                            # Show config summary
                            print(f"Configuration summary for {provider}:")
                            if isinstance(config, dict):
                                if "enabled" in config:
                                    print(f"  - Enabled: {config['enabled']}")
                                if "api_key" in config:
                                    print(f"  - API Key: {'<set>' if config['api_key'] else '<not set>'}")
                                if "api_base" in config:
                                    print(f"  - API Base: {config['api_base']}")
                                if "models" in config:
                                    models = config["models"]
                                    if isinstance(models, list):
                                        print(f"  - Models: {', '.join([m['name'] if isinstance(m, dict) and 'name' in m else str(m) for m in models])}")
                            else:
                                print(f"  - Raw config: {config}")
                        except Exception as e:
                            print(f"Error reading configuration: {e}")
                        
                        break
    
    # Check if any providers are missing
    missing_providers = set(providers) - set(provider_configs.keys())
    if missing_providers:
        print(f"\n⚠️ Missing configurations for providers: {', '.join(missing_providers)}")
        print("This might cause 'Configuration for provider not found' errors")
    
    return provider_configs

def check_embedding_configuration():
    """Check embedding configuration, which can cause 'embeddings should be of the same size' errors"""
    print("\nChecking Embedding Configuration")
    print("=============================")
    
    embedding_files = [
        "/root/.adalflow/config/embeddings.yaml",
        "/root/.adalflow/config/embedding_config.yaml",
        "/app/config/embeddings.yaml"
    ]
    
    embedding_config = None
    
    for file_path in embedding_files:
        if os.path.exists(file_path):
            print(f"✅ Found embedding configuration: {file_path}")
            try:
                with open(file_path, 'r') as f:
                    embedding_config = yaml.safe_load(f)
                
                print("Embedding configuration:")
                print(yaml.dump(embedding_config, default_flow_style=False))
                
                # Check for potential issues
                if embedding_config:
                    if "embedding_dimension" in embedding_config:
                        print(f"✅ Global embedding dimension: {embedding_config['embedding_dimension']}")
                    else:
                        print("⚠️ No global embedding_dimension specified")
                    
                    providers = ["openai", "anthropic", "google", "deepseek"]
                    dimensions = set()
                    
                    for provider in providers:
                        if provider in embedding_config:
                            provider_config = embedding_config[provider]
                            if isinstance(provider_config, dict) and "embedding_dimension" in provider_config:
                                dimensions.add(provider_config["embedding_dimension"])
                                print(f"✅ {provider} embedding dimension: {provider_config['embedding_dimension']}")
                    
                    if len(dimensions) > 1:
                        print(f"⚠️ Different embedding dimensions found: {dimensions}")
                        print("This will cause 'All embeddings should be of the same size' errors")
                    elif len(dimensions) == 1:
                        print(f"✅ All providers use the same embedding dimension: {next(iter(dimensions))}")
            except Exception as e:
                print(f"Error reading embedding configuration: {e}")
            
            break
    
    if not embedding_config:
        print("❌ No embedding configuration found")
        print("⚠️ This might cause 'All embeddings should be of the same size' errors")
    
    return embedding_config

def main():
    # Explore config directories
    found_configs = explore_config_directories()
    
    # Check provider configurations
    provider_configs = check_provider_configurations()
    
    # Check embedding configuration
    embedding_config = check_embedding_configuration()
    
    # Print recommendations
    print("\nDeepWiki Configuration Recommendations")
    print("===================================")
    
    if not provider_configs:
        print("1. Create provider configurations for all needed providers:")
        print("   - Create /root/.adalflow/providers/openai.yaml")
        print("   - Create /root/.adalflow/providers/anthropic.yaml")
        print("   - Create /root/.adalflow/providers/google.yaml")
        print("   - Create /root/.adalflow/providers/deepseek.yaml")
    
    if not embedding_config or (embedding_config and len(set(embedding_config.get(p, {}).get("embedding_dimension", 0) for p in ["openai", "anthropic", "google", "deepseek"])) > 1):
        print("2. Create a unified embedding configuration:")
        print("   - Create /root/.adalflow/config/embeddings.yaml")
        print("   - Set the same embedding_dimension for all providers")
        print("   - Example configuration:")
        print("     ```")
        print("     default_embedding_model: openai/text-embedding-3-small")
        print("     embedding_dimension: 1536")
        print("     normalize_embeddings: true")
        print("     ```")
    
    print("\nTo fix provider and embedding issues, run the fix-deepwiki-providers.sh script.")

if __name__ == "__main__":
    main()