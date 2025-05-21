#!/bin/bash
# Quick fix for scoring script to use OpenAI instead of OpenRouter
# This script creates a modified version of the simplified scoring script that doesn't require the OpenRouter API key

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Source file
SOURCE_SCRIPT="$BASE_DIR/simplified_scoring.sh"

# Check if source script exists
if [ ! -f "$SOURCE_SCRIPT" ]; then
  echo "ERROR: Source script not found: $SOURCE_SCRIPT"
  exit 1
fi

# Target file
TARGET_SCRIPT="$BASE_DIR/openai_scoring.sh"

# Create a copy of the source script
cp "$SOURCE_SCRIPT" "$TARGET_SCRIPT"

# Modify the copy to use OpenAI instead of OpenRouter
echo "Modifying script to use OpenAI instead of OpenRouter..."
sed -i '' 's/  "provider": "openrouter",/  "provider": "openai",/g' "$TARGET_SCRIPT"
sed -i '' 's/MODEL="anthropic\/claude-3-opus"/MODEL="gpt-4"/g' "$TARGET_SCRIPT"

# Update output directory in the copy
sed -i '' 's/OUTPUT_DIR="$BASE_DIR\/deepwiki_simplified_scoring"/OUTPUT_DIR="$BASE_DIR\/deepwiki_openai_scoring"/g' "$TARGET_SCRIPT"

# Make the modified script executable
chmod +x "$TARGET_SCRIPT"

echo "Created modified scoring script: $TARGET_SCRIPT"
echo "This script uses OpenAI's GPT-4 instead of OpenRouter's Claude Opus."
echo "It will save results to: $BASE_DIR/deepwiki_openai_scoring/"
echo ""
echo "To run the script: $TARGET_SCRIPT"

# Create a readme file explaining the fix
README_FILE="$BASE_DIR/docs/architecture/Deepwiki/openai_scoring_workaround.md"
mkdir -p "$(dirname "$README_FILE")"

cat > "$README_FILE" << 'EOF'
# OpenAI Scoring Workaround

## Issue

The DeepWiki OpenRouter integration was encountering API key issues when running the security analysis, with the following error:

```
Error with OpenRouter API: cannot access free variable 'e_unexp' where it is not associated with a value in enclosing scope

Please check that you have set the OPENROUTER_API_KEY environment variable with a valid API key.
```

## Quick Workaround

Instead of troubleshooting the OpenRouter API key configuration, we've created a modified version of the scoring script that uses OpenAI's API instead of OpenRouter. This approach leverages the fact that DeepWiki has built-in support for OpenAI, which appears to be working correctly.

The `openai_scoring.sh` script:

1. Uses OpenAI's GPT-4 model instead of Anthropic's Claude Opus
2. Sets the provider to "openai" instead of "openrouter"
3. Uses a separate output directory to avoid conflicts

## Usage

```bash
./openai_scoring.sh
```

Results will be saved to: `/Users/alpinro/Code Prjects/codequal/deepwiki_openai_scoring/`

## Long-term Solution

While this workaround allows you to proceed with the scoring implementation immediately, the proper long-term solution would be to:

1. Configure the OpenRouter API key correctly in the Kubernetes deployment
2. Create a Kubernetes secret for the API key
3. Update the deployment to use the secret
4. Verify the API key works with OpenRouter

## Implementation Details

The workaround was implemented by:

1. Creating a copy of the `simplified_scoring.sh` script
2. Modifying the provider from "openrouter" to "openai"
3. Changing the model from "anthropic/claude-3-opus" to "gpt-4"
4. Updating the output directory to avoid conflicts

This approach maintains all the functionality of the original scoring implementation while avoiding the OpenRouter API key issue.
EOF

echo "Created documentation: $README_FILE"
