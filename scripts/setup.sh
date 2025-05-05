#!/bin/bash

# Setup script for CodeQual project

# Create directories if they don't exist
mkdir -p logs

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "Creating .env.local from .env.example"
  cp .env.example .env.local
  echo "Please edit .env.local with your API keys and configuration"
fi

# Install dependencies
echo "Installing dependencies..."
yarn install

# Build packages
echo "Building packages..."
yarn build

echo "Setup complete!"
echo "To start development server, run: yarn dev"