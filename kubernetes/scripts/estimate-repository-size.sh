#!/bin/bash

# Repository Size Estimator
# Estimates repository size before cloning using GitHub/GitLab APIs

estimate_github_repo() {
    local REPO_URL=$1
    
    # Extract owner and repo from URL
    # Handle various GitHub URL formats
    if [[ $REPO_URL =~ github\.com[:/]([^/]+)/([^/\.]+)(\.git)?$ ]]; then
        OWNER="${BASH_REMATCH[1]}"
        REPO="${BASH_REMATCH[2]}"
    else
        echo "Invalid GitHub URL format"
        return 1
    fi
    
    # Use GitHub API to get repository info
    API_URL="https://api.github.com/repos/$OWNER/$REPO"
    
    # Add GitHub token if available
    if [ -n "$GITHUB_TOKEN" ]; then
        RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "$API_URL")
    else
        RESPONSE=$(curl -s "$API_URL")
    fi
    
    # Check if request was successful
    if echo "$RESPONSE" | jq -e '.message' >/dev/null 2>&1; then
        echo "Error: $(echo "$RESPONSE" | jq -r '.message')"
        return 1
    fi
    
    # Extract size (in KB from GitHub API)
    SIZE_KB=$(echo "$RESPONSE" | jq -r '.size // 0')
    SIZE_MB=$(echo "scale=2; $SIZE_KB / 1024" | bc)
    SIZE_GB=$(echo "scale=3; $SIZE_MB / 1024" | bc)
    
    # Get additional info
    LANGUAGE=$(echo "$RESPONSE" | jq -r '.language // "Unknown"')
    DEFAULT_BRANCH=$(echo "$RESPONSE" | jq -r '.default_branch // "main"')
    CREATED=$(echo "$RESPONSE" | jq -r '.created_at // "Unknown"')
    UPDATED=$(echo "$RESPONSE" | jq -r '.updated_at // "Unknown"')
    
    # Get languages breakdown for better estimation
    LANGUAGES_URL="https://api.github.com/repos/$OWNER/$REPO/languages"
    if [ -n "$GITHUB_TOKEN" ]; then
        LANGUAGES=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "$LANGUAGES_URL")
    else
        LANGUAGES=$(curl -s "$LANGUAGES_URL")
    fi
    
    echo "Repository: $OWNER/$REPO"
    echo "Size: ${SIZE_MB}MB (${SIZE_GB}GB)"
    echo "Primary Language: $LANGUAGE"
    echo "Default Branch: $DEFAULT_BRANCH"
    echo "Created: $CREATED"
    echo "Last Updated: $UPDATED"
    echo ""
    echo "Language Breakdown:"
    echo "$LANGUAGES" | jq -r 'to_entries | .[] | "  \(.key): \(.value) bytes"' 2>/dev/null || echo "  Unable to fetch"
    echo ""
    
    # Estimate actual clone size (GitHub API size doesn't include git history)
    # Rule of thumb: actual size is typically 2-3x the reported size
    EST_MIN=$(echo "scale=2; $SIZE_MB * 2" | bc)
    EST_MAX=$(echo "scale=2; $SIZE_MB * 3" | bc)
    
    echo "Estimated Clone Size: ${EST_MIN}MB - ${EST_MAX}MB"
    
    # Recommendation based on size
    if (( $(echo "$SIZE_MB < 100" | bc -l) )); then
        echo "Recommendation: ✅ Safe to clone (small repository)"
    elif (( $(echo "$SIZE_MB < 500" | bc -l) )); then
        echo "Recommendation: ✅ Safe to clone (medium repository)"
    elif (( $(echo "$SIZE_MB < 1000" | bc -l) )); then
        echo "Recommendation: ⚠️  Large repository - consider shallow clone"
    else
        echo "Recommendation: 🚫 Very large repository - use shallow clone or skip"
    fi
    
    return 0
}

estimate_gitlab_repo() {
    local REPO_URL=$1
    
    # Extract project path from URL
    if [[ $REPO_URL =~ gitlab\.com[:/](.+?)(\.git)?$ ]]; then
        PROJECT_PATH="${BASH_REMATCH[1]}"
        # URL encode the project path
        PROJECT_PATH_ENCODED=$(echo "$PROJECT_PATH" | sed 's/\//%2F/g')
    else
        echo "Invalid GitLab URL format"
        return 1
    fi
    
    # Use GitLab API
    API_URL="https://gitlab.com/api/v4/projects/$PROJECT_PATH_ENCODED"
    
    # Add GitLab token if available
    if [ -n "$GITLAB_TOKEN" ]; then
        RESPONSE=$(curl -s -H "PRIVATE-TOKEN: $GITLAB_TOKEN" "$API_URL")
    else
        RESPONSE=$(curl -s "$API_URL")
    fi
    
    # Check if request was successful
    if echo "$RESPONSE" | jq -e '.message' >/dev/null 2>&1; then
        echo "Error: $(echo "$RESPONSE" | jq -r '.message')"
        return 1
    fi
    
    # Extract statistics
    REPO_SIZE=$(echo "$RESPONSE" | jq -r '.statistics.repository_size // 0')
    STORAGE_SIZE=$(echo "$RESPONSE" | jq -r '.statistics.storage_size // 0')
    
    # Convert bytes to MB/GB
    REPO_SIZE_MB=$(echo "scale=2; $REPO_SIZE / 1048576" | bc)
    STORAGE_SIZE_MB=$(echo "scale=2; $STORAGE_SIZE / 1048576" | bc)
    REPO_SIZE_GB=$(echo "scale=3; $REPO_SIZE_MB / 1024" | bc)
    
    # Get additional info
    NAME=$(echo "$RESPONSE" | jq -r '.name // "Unknown"')
    DEFAULT_BRANCH=$(echo "$RESPONSE" | jq -r '.default_branch // "main"')
    CREATED=$(echo "$RESPONSE" | jq -r '.created_at // "Unknown"')
    UPDATED=$(echo "$RESPONSE" | jq -r '.last_activity_at // "Unknown"')
    
    echo "Repository: $NAME"
    echo "Repository Size: ${REPO_SIZE_MB}MB (${REPO_SIZE_GB}GB)"
    echo "Storage Size: ${STORAGE_SIZE_MB}MB"
    echo "Default Branch: $DEFAULT_BRANCH"
    echo "Created: $CREATED"
    echo "Last Activity: $UPDATED"
    echo ""
    
    # Recommendation
    if (( $(echo "$REPO_SIZE_MB < 100" | bc -l) )); then
        echo "Recommendation: ✅ Safe to clone"
    elif (( $(echo "$REPO_SIZE_MB < 1000" | bc -l) )); then
        echo "Recommendation: ⚠️  Large repository - monitor storage"
    else
        echo "Recommendation: 🚫 Very large repository - use shallow clone"
    fi
    
    return 0
}

# Function to estimate multiple repositories
estimate_bulk() {
    local REPOS_FILE=$1
    local TOTAL_SIZE_MB=0
    local COUNT=0
    
    echo "Bulk Repository Size Estimation"
    echo "═══════════════════════════════════════════════════════════════════"
    
    while IFS= read -r REPO_URL; do
        if [ -z "$REPO_URL" ] || [[ "$REPO_URL" =~ ^# ]]; then
            continue
        fi
        
        echo ""
        echo "Analyzing: $REPO_URL"
        echo "-------------------------------------------------------------------"
        
        if [[ $REPO_URL =~ github\.com ]]; then
            SIZE_LINE=$(estimate_github_repo "$REPO_URL" | grep "^Size:" | head -1)
            SIZE_MB=$(echo "$SIZE_LINE" | sed -n 's/Size: \([0-9.]*\)MB.*/\1/p')
        elif [[ $REPO_URL =~ gitlab\.com ]]; then
            SIZE_LINE=$(estimate_gitlab_repo "$REPO_URL" | grep "^Repository Size:" | head -1)
            SIZE_MB=$(echo "$SIZE_LINE" | sed -n 's/Repository Size: \([0-9.]*\)MB.*/\1/p')
        else
            echo "Unsupported repository host"
            continue
        fi
        
        if [ -n "$SIZE_MB" ]; then
            TOTAL_SIZE_MB=$(echo "scale=2; $TOTAL_SIZE_MB + $SIZE_MB" | bc)
            COUNT=$((COUNT + 1))
        fi
        
    done < "$REPOS_FILE"
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo "Summary:"
    echo "  Repositories analyzed: $COUNT"
    echo "  Total size: ${TOTAL_SIZE_MB}MB"
    echo "  Estimated clone size: $(echo "scale=2; $TOTAL_SIZE_MB * 2.5" | bc)MB"
    echo "  Recommended storage: $(echo "scale=2; $TOTAL_SIZE_MB * 3" | bc)MB"
}

# Main script
if [ $# -eq 0 ]; then
    echo "Repository Size Estimator"
    echo ""
    echo "Usage:"
    echo "  $0 <repository-url>              Estimate single repository"
    echo "  $0 -f <file>                     Estimate multiple repositories from file"
    echo ""
    echo "Examples:"
    echo "  $0 https://github.com/facebook/react"
    echo "  $0 https://gitlab.com/gitlab-org/gitlab"
    echo "  $0 -f repositories.txt"
    echo ""
    echo "Environment Variables:"
    echo "  GITHUB_TOKEN    GitHub personal access token (for private repos)"
    echo "  GITLAB_TOKEN    GitLab personal access token (for private repos)"
    exit 1
fi

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed"
    echo "Install with: apt-get install jq"
    exit 1
fi

# Process arguments
if [ "$1" = "-f" ]; then
    if [ -z "$2" ]; then
        echo "Error: Please provide a file name"
        exit 1
    fi
    if [ ! -f "$2" ]; then
        echo "Error: File '$2' not found"
        exit 1
    fi
    estimate_bulk "$2"
else
    REPO_URL=$1
    
    if [[ $REPO_URL =~ github\.com ]]; then
        estimate_github_repo "$REPO_URL"
    elif [[ $REPO_URL =~ gitlab\.com ]]; then
        estimate_gitlab_repo "$REPO_URL"
    else
        echo "Error: Unsupported repository host"
        echo "Currently supported: GitHub, GitLab"
        exit 1
    fi
fi