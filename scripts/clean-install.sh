#!/bin/bash

# Clean up yarn-related files
echo "Cleaning up yarn-related files..."
find . -name "yarn.lock" -type f -delete
find . -name ".yarn" -type d -exec rm -rf {} +
find . -name ".yarnrc" -type f -delete
find . -name ".yarnrc.yml" -type f -delete

# Remove node_modules
echo "Removing node_modules directories..."
find . -name "node_modules" -type d -exec rm -rf {} +

# Reinstall with npm
echo "Reinstalling dependencies with npm..."
npm install

echo "Done! Your project is now using npm consistently."
