#!/bin/bash

# MCP Tools Environment Setup Script
# This script helps you set up the required environment variables for MCP tools

echo "=== MCP Tools Environment Setup ==="
echo ""

# Check if the environment variables are already set
check_env_var() {
    if [ -z "${!1}" ]; then
        return 1
    else
        return 0
    fi
}

# Function to add environment variable to shell profile
add_to_profile() {
    local var_name=$1
    local var_value=$2
    local profile_file=$3
    
    echo "export $var_name=\"$var_value\"" >> "$profile_file"
}

# Detect shell profile file
if [ -n "$ZSH_VERSION" ]; then
    PROFILE_FILE="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    PROFILE_FILE="$HOME/.bashrc"
else
    PROFILE_FILE="$HOME/.profile"
fi

echo "Detected shell profile: $PROFILE_FILE"
echo ""

# REF API Key
if check_env_var "REF_API_KEY"; then
    echo "✓ REF_API_KEY is already set"
else
    echo "✗ REF_API_KEY is not set"
    echo "Please enter your REF API key (from https://ref.tools):"
    read -r REF_KEY
    if [ -n "$REF_KEY" ]; then
        add_to_profile "REF_API_KEY" "$REF_KEY" "$PROFILE_FILE"
        export REF_API_KEY="$REF_KEY"
        echo "✓ REF_API_KEY added to $PROFILE_FILE"
    fi
fi

# Semgrep App Token
if check_env_var "SEMGREP_APP_TOKEN"; then
    echo "✓ SEMGREP_APP_TOKEN is already set"
else
    echo "✗ SEMGREP_APP_TOKEN is not set"
    echo "Please enter your Semgrep App Token (from https://semgrep.dev):"
    read -r SEMGREP_TOKEN
    if [ -n "$SEMGREP_TOKEN" ]; then
        add_to_profile "SEMGREP_APP_TOKEN" "$SEMGREP_TOKEN" "$PROFILE_FILE"
        export SEMGREP_APP_TOKEN="$SEMGREP_TOKEN"
        echo "✓ SEMGREP_APP_TOKEN added to $PROFILE_FILE"
    fi
fi

# EXA API Key
if check_env_var "EXA_API_KEY"; then
    echo "✓ EXA_API_KEY is already set"
else
    echo "✗ EXA_API_KEY is not set"
    echo "Please enter your EXA API key (from https://exa.ai):"
    read -r EXA_KEY
    if [ -n "$EXA_KEY" ]; then
        add_to_profile "EXA_API_KEY" "$EXA_KEY" "$PROFILE_FILE"
        export EXA_API_KEY="$EXA_KEY"
        echo "✓ EXA_API_KEY added to $PROFILE_FILE"
    fi
fi

# Tavily API Key
if check_env_var "TAVILY_API_KEY"; then
    echo "✓ TAVILY_API_KEY is already set"
else
    echo "✗ TAVILY_API_KEY is not set"
    echo "Please enter your Tavily API key (from https://tavily.com):"
    read -r TAVILY_KEY
    if [ -n "$TAVILY_KEY" ]; then
        add_to_profile "TAVILY_API_KEY" "$TAVILY_KEY" "$PROFILE_FILE"
        export TAVILY_API_KEY="$TAVILY_KEY"
        echo "✓ TAVILY_API_KEY added to $PROFILE_FILE"
    fi
fi

echo ""
echo "=== Setup Summary ==="

# Check final status
all_set=true
for var in REF_API_KEY SEMGREP_APP_TOKEN EXA_API_KEY TAVILY_API_KEY; do
    if check_env_var "$var"; then
        echo "✓ $var is configured"
    else
        echo "✗ $var is NOT configured"
        all_set=false
    fi
done

echo ""
if [ "$all_set" = true ]; then
    echo "✅ All environment variables are configured!"
    echo "Run 'source $PROFILE_FILE' to reload your shell configuration."
else
    echo "⚠️  Some environment variables are missing. Please configure them manually."
fi

echo ""
echo "Next steps:"
echo "1. Install the MCP servers (if not already installed):"
echo "   npm install -g @ref.tools/ref-mcp-server exa-mcp-server"
echo "   pip3 install semgrep semgrep-mcp"
echo ""
echo "2. Copy the configuration files to the appropriate locations:"
echo "   - Claude Desktop: ~/Library/Application Support/Claude/"
echo "   - Code Claude: ~/.vscode/extensions/codeclaudeapp.claude-code-*/"
echo ""
echo "3. Restart Claude Desktop and/or VS Code to load the new MCP servers"