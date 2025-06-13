#!/bin/bash

# Tool Runner Shell Script
# This script is executed by DeepWiki to run analysis tools

REPO_PATH=$1
TOOLS_TO_RUN=$2
OUTPUT_FILE=$3

if [ -z "$REPO_PATH" ]; then
    echo "Error: Repository path not provided"
    exit 1
fi

# Default to all tools if not specified
if [ -z "$TOOLS_TO_RUN" ]; then
    TOOLS_TO_RUN="npm-audit,license-checker,madge,dependency-cruiser,npm-outdated"
fi

# Create output directory
OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
mkdir -p "$OUTPUT_DIR"

# Initialize results
echo "{" > "$OUTPUT_FILE"
echo '  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",' >> "$OUTPUT_FILE"
echo '  "repository": "'$REPO_PATH'",' >> "$OUTPUT_FILE"
echo '  "results": {' >> "$OUTPUT_FILE"

# Function to run a tool and capture output
run_tool() {
    local tool_name=$1
    local tool_command=$2
    local start_time=$(date +%s%N)
    
    echo "Running $tool_name..." >&2
    
    # Create temporary file for tool output
    local temp_output="/tmp/${tool_name}_output_$$.json"
    
    # Run the tool
    cd "$REPO_PATH"
    if eval "$tool_command" > "$temp_output" 2>/dev/null; then
        local end_time=$(date +%s%N)
        local execution_time=$((($end_time - $start_time) / 1000000))
        
        echo "    \"$tool_name\": {" >> "$OUTPUT_FILE"
        echo "      \"success\": true," >> "$OUTPUT_FILE"
        echo "      \"executionTime\": $execution_time," >> "$OUTPUT_FILE"
        echo "      \"output\": $(cat "$temp_output")" >> "$OUTPUT_FILE"
        echo "    }," >> "$OUTPUT_FILE"
    else
        local end_time=$(date +%s%N)
        local execution_time=$((($end_time - $start_time) / 1000000))
        
        echo "    \"$tool_name\": {" >> "$OUTPUT_FILE"
        echo "      \"success\": false," >> "$OUTPUT_FILE"
        echo "      \"executionTime\": $execution_time," >> "$OUTPUT_FILE"
        echo "      \"error\": \"Tool execution failed\"" >> "$OUTPUT_FILE"
        echo "    }," >> "$OUTPUT_FILE"
    fi
    
    rm -f "$temp_output"
}

# Check if package.json exists
if [ -f "$REPO_PATH/package.json" ]; then
    # Run npm-audit if package-lock.json exists
    if [[ $TOOLS_TO_RUN == *"npm-audit"* ]] && [ -f "$REPO_PATH/package-lock.json" ]; then
        run_tool "npm-audit" "npm audit --json"
    fi
    
    # Run license-checker
    if [[ $TOOLS_TO_RUN == *"license-checker"* ]]; then
        run_tool "license-checker" "npx license-checker --json --production"
    fi
    
    # Run npm-outdated
    if [[ $TOOLS_TO_RUN == *"npm-outdated"* ]]; then
        run_tool "npm-outdated" "npm outdated --json || true"
    fi
fi

# Find source directory for JavaScript analysis tools
SRC_DIR="$REPO_PATH"
for dir in src lib app source; do
    if [ -d "$REPO_PATH/$dir" ]; then
        SRC_DIR="$REPO_PATH/$dir"
        break
    fi
done

# Run madge for circular dependency detection
if [[ $TOOLS_TO_RUN == *"madge"* ]]; then
    run_tool "madge" "npx madge --circular --json '$SRC_DIR'"
fi

# Run dependency-cruiser
if [[ $TOOLS_TO_RUN == *"dependency-cruiser"* ]]; then
    # Check for config file
    CONFIG_FILE=""
    for config in .dependency-cruiser.js .dependency-cruiser.json dependency-cruiser.config.js; do
        if [ -f "$REPO_PATH/$config" ]; then
            CONFIG_FILE="--config '$REPO_PATH/$config'"
            break
        fi
    done
    
    run_tool "dependency-cruiser" "npx dependency-cruiser '$SRC_DIR' --output-type json $CONFIG_FILE"
fi

# Remove trailing comma and close JSON
sed -i '$ s/,$//' "$OUTPUT_FILE"
echo '  }' >> "$OUTPUT_FILE"
echo '}' >> "$OUTPUT_FILE"

echo "Tool execution completed" >&2
