#!/bin/bash

# Start DeepWiki Server
# This script starts the DeepWiki API server

echo "DeepWiki Server Starter"
echo "======================="
echo ""

# Directory of DeepWiki
DEEPWIKI_DIR="/Users/alpinro/Code Prjects/deepwiki-open"

# Check if DeepWiki directory exists
if [ ! -d "$DEEPWIKI_DIR" ]; then
  echo "ERROR: DeepWiki directory not found at $DEEPWIKI_DIR"
  exit 1
fi

# Check for API keys in .env
if [ -f "$DEEPWIKI_DIR/.env" ]; then
  echo "Found .env file in DeepWiki directory"
  
  # Load .env file
  source "$DEEPWIKI_DIR/.env"
  
  # Check for required API keys
  if [ -z "$GOOGLE_API_KEY" ] || [ -z "$OPENAI_API_KEY" ]; then
    echo "WARNING: Missing required API keys in .env file"
    echo "The .env file should contain:"
    echo "GOOGLE_API_KEY=your_google_api_key"
    echo "OPENAI_API_KEY=your_openai_api_key"
    
    # Ask to update the .env file
    read -p "Would you like to update the .env file? (y/n): " UPDATE_ENV
    
    if [ "$UPDATE_ENV" == "y" ]; then
      echo "Updating .env file..."
      
      # Create a backup of the current .env file
      if [ -f "$DEEPWIKI_DIR/.env" ]; then
        cp "$DEEPWIKI_DIR/.env" "$DEEPWIKI_DIR/.env.backup"
        echo "Backup created at $DEEPWIKI_DIR/.env.backup"
      fi
      
      # Prompt for keys
      echo "Enter API keys (will not be visible when typing):"
      read -p "GOOGLE_API_KEY: " -s GOOGLE_KEY
      echo ""
      read -p "OPENAI_API_KEY: " -s OPENAI_KEY
      echo ""
      
      # Create new .env file
      echo "GOOGLE_API_KEY=$GOOGLE_KEY" > "$DEEPWIKI_DIR/.env"
      echo "OPENAI_API_KEY=$OPENAI_KEY" >> "$DEEPWIKI_DIR/.env"
      
      echo "Updated .env file with new API keys"
    fi
  else
    echo "Found required API keys in .env file"
  fi
else
  echo "WARNING: No .env file found in DeepWiki directory"
  echo "Creating a new .env file..."
  
  # Prompt for keys
  echo "Enter API keys (will not be visible when typing):"
  read -p "GOOGLE_API_KEY: " -s GOOGLE_KEY
  echo ""
  read -p "OPENAI_API_KEY: " -s OPENAI_KEY
  echo ""
  
  # Create new .env file
  echo "GOOGLE_API_KEY=$GOOGLE_KEY" > "$DEEPWIKI_DIR/.env"
  echo "OPENAI_API_KEY=$OPENAI_KEY" >> "$DEEPWIKI_DIR/.env"
  
  echo "Created .env file with API keys"
fi

# Check if Python virtual environment is activated
if [ -d "$DEEPWIKI_DIR/venv" ]; then
  echo "Found Python virtual environment"
  
  # Activate virtual environment
  echo "Activating virtual environment..."
  source "$DEEPWIKI_DIR/venv/bin/activate" || {
    echo "ERROR: Failed to activate virtual environment"
    echo "You may need to activate it manually:"
    echo "cd \"$DEEPWIKI_DIR\" && source venv/bin/activate"
    exit 1
  }
else
  echo "WARNING: No Python virtual environment found"
  echo "You may need to install dependencies manually:"
  echo "pip install -r \"$DEEPWIKI_DIR/api/requirements.txt\""
fi

# Check if api directory exists
if [ ! -d "$DEEPWIKI_DIR/api" ]; then
  echo "ERROR: API directory not found at $DEEPWIKI_DIR/api"
  exit 1
fi

# Check if requirements.txt exists
if [ -f "$DEEPWIKI_DIR/api/requirements.txt" ]; then
  echo "Found API requirements file"
  
  # Ask to install requirements
  read -p "Would you like to install/update the API requirements? (y/n): " INSTALL_REQS
  
  if [ "$INSTALL_REQS" == "y" ]; then
    echo "Installing API requirements..."
    pip install -r "$DEEPWIKI_DIR/api/requirements.txt" || {
      echo "ERROR: Failed to install API requirements"
      exit 1
    }
    echo "API requirements installed successfully"
  fi
else
  echo "WARNING: API requirements file not found"
  echo "You may need to manually install dependencies"
fi

# Check if main.py exists
if [ ! -f "$DEEPWIKI_DIR/api/main.py" ]; then
  echo "ERROR: API main.py not found at $DEEPWIKI_DIR/api/main.py"
  exit 1
fi

# Start the API server
echo ""
echo "Starting DeepWiki API server..."
echo "The server will run in this terminal. Press Ctrl+C to stop."
echo "Open a new terminal for your tests after the server starts."
echo ""
echo "Once the server is running, you can test it with:"
echo "bash /Users/alpinro/Code\\ Prjects/codequal/packages/core/src/deepwiki/check-server.sh"
echo ""
echo "Starting server now..."
echo "----------------------------------------"

# Change to DeepWiki directory
cd "$DEEPWIKI_DIR" || {
  echo "ERROR: Failed to change to DeepWiki directory"
  exit 1
}

# Start the API server
python -m api.main || {
  echo "ERROR: Failed to start API server"
  exit 1
}
