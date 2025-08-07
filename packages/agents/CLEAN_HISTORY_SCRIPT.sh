#!/bin/bash

# Script to clean secrets from git history
# WARNING: This will rewrite history!

echo "Creating backup branch..."
git branch backup-before-clean

echo "Starting interactive rebase to remove secrets..."
# We need to rebase from the commit before the problematic one
git rebase -i dbb32d9^

# In the editor that opens:
# 1. Change 'pick' to 'edit' for commit dbb32d9
# 2. Save and exit
# 3. Then run:
#    git rm test-deepwiki-pr-analysis-final.js test-deepwiki-real-pr-with-token.js test-deepwiki-small-repo.js
#    git commit --amend
#    git rebase --continue

echo "After cleaning, force push with:"
echo "git push --force-lease origin main"