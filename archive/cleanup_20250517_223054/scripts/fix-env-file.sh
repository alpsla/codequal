#!/bin/bash

# Fix .env File Script
# This script helps fix format issues in .env file

echo "DeepWiki .env File Fixer"
echo "======================="
echo ""

ENV_FILE="/Users/alpinro/Code Prjects/codequal/.env"

# Backup the current .env file
if [ -f "$ENV_FILE" ]; then
  BACKUP_FILE="$ENV_FILE.backup.$(date +"%Y%m%d%H%M%S")"
  echo "Creating backup of current .env file: $BACKUP_FILE"
  cp "$ENV_FILE" "$BACKUP_FILE"
  
  echo "Analyzing current .env file format..."
  # Check if the file has Windows line endings
  if grep -q $'\r' "$ENV_FILE"; then
    echo "WARNING: File has Windows-style line endings (CRLF)"
  fi
  
  # Check if OPENROUTER_API_KEY has quotes or spaces
  OPENROUTER_LINE=$(grep "OPENROUTER_API_KEY" "$ENV_FILE")
  if echo "$OPENROUTER_LINE" | grep -q "\""; then
    echo "WARNING: OPENROUTER_API_KEY has quotes which may cause parsing issues"
  fi
  
  if echo "$OPENROUTER_LINE" | grep -q " "; then
    echo "WARNING: OPENROUTER_API_KEY has spaces which may cause parsing issues"
  fi
  
  # Extract the key values from the file
  echo ""
  echo "Current API keys in .env file:"
  if grep -q "OPENAI_API_KEY" "$ENV_FILE"; then
    OPENAI_VALUE=$(grep "OPENAI_API_KEY" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
    echo "OPENAI_API_KEY=${OPENAI_VALUE:0:4}...${OPENAI_VALUE: -4}"
  fi
  
  if grep -q "GOOGLE_API_KEY" "$ENV_FILE"; then
    GOOGLE_VALUE=$(grep "GOOGLE_API_KEY" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
    echo "GOOGLE_API_KEY=${GOOGLE_VALUE:0:4}...${GOOGLE_VALUE: -4}"
  fi
  
  if grep -q "GEMINI_API_KEY" "$ENV_FILE"; then
    GEMINI_VALUE=$(grep "GEMINI_API_KEY" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
    echo "GEMINI_API_KEY=${GEMINI_VALUE:0:4}...${GEMINI_VALUE: -4}"
  fi
  
  if grep -q "ANTHROPIC_API_KEY" "$ENV_FILE"; then
    ANTHROPIC_VALUE=$(grep "ANTHROPIC_API_KEY" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
    echo "ANTHROPIC_API_KEY=${ANTHROPIC_VALUE:0:4}...${ANTHROPIC_VALUE: -4}"
  fi
  
  if grep -q "OPENROUTER_API_KEY" "$ENV_FILE"; then
    OPENROUTER_VALUE=$(grep "OPENROUTER_API_KEY" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
    echo "OPENROUTER_API_KEY=${OPENROUTER_VALUE:0:4}...${OPENROUTER_VALUE: -4}"
  fi
  
  # Ask to fix the file
  echo ""
  echo "Would you like to fix the .env file format?"
  read -p "Fix .env file? (y/n): " FIX_ENV
  
  if [ "$FIX_ENV" == "y" ]; then
    echo "Creating a clean .env file..."
    
    NEW_ENV_FILE="${ENV_FILE}.new"
    
    # Start with a fresh file
    echo "# API Keys for DeepWiki - $(date)" > "$NEW_ENV_FILE"
    
    # Add keys with clean formatting
    if [ -n "$OPENAI_VALUE" ]; then
      echo "OPENAI_API_KEY=$OPENAI_VALUE" >> "$NEW_ENV_FILE"
    fi
    
    if [ -n "$GOOGLE_VALUE" ]; then
      echo "GOOGLE_API_KEY=$GOOGLE_VALUE" >> "$NEW_ENV_FILE"
    fi
    
    if [ -n "$GEMINI_VALUE" ]; then
      echo "GEMINI_API_KEY=$GEMINI_VALUE" >> "$NEW_ENV_FILE"
    fi
    
    if [ -n "$ANTHROPIC_VALUE" ]; then
      echo "ANTHROPIC_API_KEY=$ANTHROPIC_VALUE" >> "$NEW_ENV_FILE"
    fi
    
    if [ -n "$OPENROUTER_VALUE" ]; then
      echo "OPENROUTER_API_KEY=$OPENROUTER_VALUE" >> "$NEW_ENV_FILE"
    fi
    
    # Copy any other lines that don't have API keys
    grep -v "OPENAI_API_KEY" "$ENV_FILE" | \
    grep -v "GOOGLE_API_KEY" | \
    grep -v "GEMINI_API_KEY" | \
    grep -v "ANTHROPIC_API_KEY" | \
    grep -v "OPENROUTER_API_KEY" >> "$NEW_ENV_FILE"
    
    # Replace the original file
    mv "$NEW_ENV_FILE" "$ENV_FILE"
    
    echo "Fixed .env file created."
    echo "Original file backed up at $BACKUP_FILE"
  fi
else
  echo "No .env file found at $ENV_FILE"
  
  # Ask to create a new file
  echo ""
  echo "Would you like to create a new .env file?"
  read -p "Create new .env file? (y/n): " CREATE_ENV
  
  if [ "$CREATE_ENV" == "y" ]; then
    echo "Creating new .env file..."
    
    # Prompt for keys
    read -p "Enter OPENAI_API_KEY (or press Enter to skip): " OPENAI_VALUE
    read -p "Enter GOOGLE_API_KEY or GEMINI_API_KEY (or press Enter to skip): " GOOGLE_VALUE
    read -p "Enter ANTHROPIC_API_KEY (or press Enter to skip): " ANTHROPIC_VALUE
    read -p "Enter OPENROUTER_API_KEY (or press Enter to skip): " OPENROUTER_VALUE
    
    # Create new .env file
    echo "# API Keys for DeepWiki - $(date)" > "$ENV_FILE"
    
    if [ -n "$OPENAI_VALUE" ]; then
      echo "OPENAI_API_KEY=$OPENAI_VALUE" >> "$ENV_FILE"
    fi
    
    if [ -n "$GOOGLE_VALUE" ]; then
      echo "GOOGLE_API_KEY=$GOOGLE_VALUE" >> "$ENV_FILE"
    fi
    
    if [ -n "$ANTHROPIC_VALUE" ]; then
      echo "ANTHROPIC_API_KEY=$ANTHROPIC_VALUE" >> "$ENV_FILE"
    fi
    
    if [ -n "$OPENROUTER_VALUE" ]; then
      echo "OPENROUTER_API_KEY=$OPENROUTER_VALUE" >> "$ENV_FILE"
    fi
    
    echo "New .env file created at $ENV_FILE"
  fi
fi

echo ""
echo "Next, test the environment variables with:"
echo "source $ENV_FILE && echo \$OPENROUTER_API_KEY"
echo ""
echo "Then run the simple multi-test with:"
echo "source $ENV_FILE && bash /Users/alpinro/Code\\ Prjects/codequal/packages/core/src/deepwiki/simple-multi-test.sh"
