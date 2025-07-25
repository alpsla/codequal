#!/bin/bash

# DeepWiki Repository Cleanup Script
# This script runs periodically to clean up old cloned repositories
# to prevent disk space exhaustion

REPO_DIR="/root/.adalflow/repos"
EMBEDDINGS_DIR="/root/.adalflow/embeddings"
LOG_FILE="/var/log/deepwiki-cleanup.log"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Function to get disk usage percentage
get_disk_usage() {
    df -h "$REPO_DIR" | awk 'NR==2 {print $5}' | sed 's/%//'
}

# Function to clean old repositories
clean_old_repos() {
    local age_minutes=$1
    log_message "Starting cleanup of repositories older than $age_minutes minutes"
    
    # Find and remove directories older than specified minutes
    find "$REPO_DIR" -mindepth 1 -maxdepth 1 -type d -mmin +$age_minutes -exec rm -rf {} \; 2>/dev/null
    
    # Count remaining repositories
    local remaining=$(find "$REPO_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
    log_message "Cleanup complete. Remaining repositories: $remaining"
}

# Function to clean old embeddings
clean_old_embeddings() {
    local age_days=$1
    log_message "Cleaning embeddings older than $age_days days"
    
    find "$EMBEDDINGS_DIR" -type f -mtime +$age_days -delete 2>/dev/null
}

# Main cleanup logic
main() {
    log_message "=== DeepWiki Cleanup Started ==="
    
    # Get current disk usage
    local disk_usage=$(get_disk_usage)
    log_message "Current disk usage: $disk_usage%"
    
    # Aggressive cleanup if disk usage is critical (>90%)
    if [ "$disk_usage" -gt 90 ]; then
        log_message "CRITICAL: Disk usage above 90%. Performing aggressive cleanup."
        clean_old_repos 30  # Remove repos older than 30 minutes
        clean_old_embeddings 1  # Remove embeddings older than 1 day
    # Moderate cleanup if disk usage is high (>70%)
    elif [ "$disk_usage" -gt 70 ]; then
        log_message "WARNING: Disk usage above 70%. Performing moderate cleanup."
        clean_old_repos 120  # Remove repos older than 2 hours
        clean_old_embeddings 3  # Remove embeddings older than 3 days
    # Light cleanup if disk usage is moderate (>50%)
    elif [ "$disk_usage" -gt 50 ]; then
        log_message "INFO: Disk usage above 50%. Performing light cleanup."
        clean_old_repos 360  # Remove repos older than 6 hours
        clean_old_embeddings 7  # Remove embeddings older than 7 days
    else
        log_message "INFO: Disk usage is healthy at $disk_usage%"
        # Still clean very old repos to prevent accumulation
        clean_old_repos 1440  # Remove repos older than 24 hours
        clean_old_embeddings 14  # Remove embeddings older than 14 days
    fi
    
    # Final disk usage
    local final_usage=$(get_disk_usage)
    log_message "Final disk usage: $final_usage%"
    log_message "=== DeepWiki Cleanup Completed ==="
}

# Run main function
main