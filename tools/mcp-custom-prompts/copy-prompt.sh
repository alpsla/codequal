#!/bin/bash

# Create a concise version of the prompt that doesn't waste tokens
cat > /tmp/concise_prompt.txt << 'EOL'
I'm working on the CodeQual project. Please follow these guidelines:

1. Keep file sizes below 500 lines - if we reach this limit, help me refactor the project structure
2. Only create new documentation for fixes or features after they've been tested and confirmed
3. At the beginning of each session, review the most recent summary in '/Users/alpinro/Code Prjects/codequal/docs/session-summaries/'
4. When I indicate we're finishing our conversation (by saying something like "let's end here", "that's all for today", or similar), create a detailed summary of our chat in '/Users/alpinro/Code Prjects/codequal/docs/session-summaries/' with filename format: YYYY-MM-DD-session-summary.md

Please confirm you can access the filesystem and verify access to "/Users/alpinro/Code Prjects/codequal/packages"
EOL

# Copy to clipboard
cat /tmp/concise_prompt.txt | pbcopy

echo "Concise prompt copied to clipboard! Paste it at the start of a new Claude chat."
