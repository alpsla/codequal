#!/bin/bash
# Convenience script to run DeepWiki setup from project root
# The actual script is now in the standard directory

STANDARD_SCRIPT="./packages/agents/src/standard/scripts/deepwiki/setup-deepwiki-environment.sh"

if [ -f "$STANDARD_SCRIPT" ]; then
    exec "$STANDARD_SCRIPT" "$@"
else
    echo "Error: DeepWiki setup script not found at: $STANDARD_SCRIPT"
    echo "Please ensure you're running this from the project root directory."
    exit 1
fi