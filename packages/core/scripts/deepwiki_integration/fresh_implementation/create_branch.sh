#!/bin/bash
# Script to create a new branch for the fresh DeepWiki OpenRouter implementation

# Branch name
BRANCH_NAME="feature/deepwiki-openrouter-fresh-implementation"

# Get the current branch
CURRENT_BRANCH=$(git -C /Users/alpinro/Code\ Prjects/codequal branch --show-current)

# Create and switch to the new branch
echo "Current branch: $CURRENT_BRANCH"
echo "Creating new branch: $BRANCH_NAME"

git -C /Users/alpinro/Code\ Prjects/codequal checkout -b "$BRANCH_NAME"

if [ $? -eq 0 ]; then
  echo "Successfully created and switched to branch: $BRANCH_NAME"
  
  # Add all new files we've created
  echo "Adding new files to the branch..."
  git -C /Users/alpinro/Code\ Prjects/codequal add \
    /Users/alpinro/Code\ Prjects/codequal/docs/Deepwiki/implementation/DeepWiki_OpenRouter_Fresh_Implementation_Plan.md \
    /Users/alpinro/Code\ Prjects/codequal/docs/Deepwiki/implementation/DeepWiki_OpenRouter_Fresh_Implementation_Summary.md \
    /Users/alpinro/Code\ Prjects/codequal/packages/core/scripts/deepwiki_integration/fresh_implementation/ \
    /Users/alpinro/Code\ Prjects/codequal/packages/core/src/services/deepwiki-service.ts \
    /Users/alpinro/Code\ Prjects/codequal/docs/session-summaries/2025-05-21-session-summary.md
  
  echo ""
  echo "Next steps:"
  echo "1. Review the changes: git status"
  echo "2. Commit the changes: git commit -m \"feat: Add fresh DeepWiki OpenRouter implementation\""
  echo "3. Push the branch: git push -u origin $BRANCH_NAME"
  echo ""
  echo "To switch back to your previous branch:"
  echo "git checkout $CURRENT_BRANCH"
else
  echo "Failed to create branch. Please create it manually:"
  echo "git checkout -b $BRANCH_NAME"
fi
