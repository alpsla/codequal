#!/bin/bash

# Debug Environment Variables
# This script examines environment variables and .env file

echo "Environment Variable Debug"
echo "========================="
echo ""

ENV_FILE="/Users/alpinro/Code Prjects/codequal/.env"

echo "Checking for .env file at: $ENV_FILE"
if [ -f "$ENV_FILE" ]; then
  echo "Found .env file!"
  
  echo ""
  echo "Contents of .env file (only key names):"
  grep -v '^#' "$ENV_FILE" | cut -d'=' -f1 | sort
  
  echo ""
  echo "Checking for specific keys in .env:"
  if grep -q "OPENROUTER_API_KEY" "$ENV_FILE"; then
    echo "✓ OPENROUTER_API_KEY found in .env file"
  else
    echo "✗ OPENROUTER_API_KEY not found in .env file"
  fi
  
  if grep -q "GOOGLE_API_KEY" "$ENV_FILE"; then
    echo "✓ GOOGLE_API_KEY found in .env file"
  else
    echo "✗ GOOGLE_API_KEY not found in .env file"
  fi
  
  if grep -q "GEMINI_API_KEY" "$ENV_FILE"; then
    echo "✓ GEMINI_API_KEY found in .env file"
  else
    echo "✗ GEMINI_API_KEY not found in .env file"
  fi
  
  if grep -q "ANTHROPIC_API_KEY" "$ENV_FILE"; then
    echo "✓ ANTHROPIC_API_KEY found in .env file"
  else
    echo "✗ ANTHROPIC_API_KEY not found in .env file"
  fi
  
  if grep -q "OPENAI_API_KEY" "$ENV_FILE"; then
    echo "✓ OPENAI_API_KEY found in .env file"
  else
    echo "✗ OPENAI_API_KEY not found in .env file"
  fi
else
  echo "No .env file found at $ENV_FILE"
fi

echo ""
echo "Current environment variables (API keys masked):"
env | grep -i "_API_KEY" | while read line; do
  key=$(echo "$line" | cut -d'=' -f1)
  value=$(echo "$line" | cut -d'=' -f2)
  # Mask the value, showing only first 4 and last 4 characters
  if [ ${#value} -gt 8 ]; then
    masked_value="${value:0:4}...${value: -4}"
  else
    masked_value="****"
  fi
  echo "$key=$masked_value"
done

echo ""
echo "Create a simple .env file with your keys?"
echo "This will help ensure the scripts can find your API keys."
read -p "Create new .env file? (y/n): " CREATE_ENV

if [ "$CREATE_ENV" == "y" ]; then
  echo "Creating new .env file..."
  
  # Prompt for keys
  read -p "Enter OPENAI_API_KEY (or press Enter to skip): " OPENAI_KEY
  read -p "Enter GOOGLE_API_KEY or GEMINI_API_KEY (or press Enter to skip): " GOOGLE_KEY
  read -p "Enter ANTHROPIC_API_KEY (or press Enter to skip): " ANTHROPIC_KEY
  read -p "Enter OPENROUTER_API_KEY (or press Enter to skip): " OPENROUTER_KEY
  
  # Create new .env file
  echo "# API Keys for DeepWiki" > "$ENV_FILE"
  
  if [ -n "$OPENAI_KEY" ]; then
    echo "OPENAI_API_KEY=$OPENAI_KEY" >> "$ENV_FILE"
  fi
  
  if [ -n "$GOOGLE_KEY" ]; then
    echo "GOOGLE_API_KEY=$GOOGLE_KEY" >> "$ENV_FILE"
  fi
  
  if [ -n "$ANTHROPIC_KEY" ]; then
    echo "ANTHROPIC_API_KEY=$ANTHROPIC_KEY" >> "$ENV_FILE"
  fi
  
  if [ -n "$OPENROUTER_KEY" ]; then
    echo "OPENROUTER_API_KEY=$OPENROUTER_KEY" >> "$ENV_FILE"
  fi
  
  echo "New .env file created at $ENV_FILE"
fi

echo ""
echo "Next steps:"
echo "1. You can now run the tests with:"
echo "   source $ENV_FILE && bash /Users/alpinro/Code\\ Prjects/codequal/packages/core/src/deepwiki/simple-multi-test.sh"
echo ""
echo "2. This will ensure all environment variables are properly loaded."
