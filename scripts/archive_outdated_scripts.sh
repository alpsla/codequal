#!/bin/bash
# Script to archive outdated scripts
# Created: May 15, 2025

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPTS_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/scripts"
ARCHIVE_DIR="${SCRIPTS_DIR}/archived-scripts/may-2025-archive"

echo -e "${BLUE}=== Archiving Outdated Scripts ===${NC}"

# Create archive directory if it doesn't exist
mkdir -p "${ARCHIVE_DIR}"
echo -e "Created archive directory: ${YELLOW}${ARCHIVE_DIR}${NC}"

# List of scripts to archive (based on our analysis)
SCRIPTS_TO_ARCHIVE=(
  "check-calibration-readiness.js"
  "enhanced-calibration.js"
  "generate-detailed-report.js"
  "reset-calibration.js"
)

# Archive each script
for script in "${SCRIPTS_TO_ARCHIVE[@]}"; do
  source_path="${SCRIPTS_DIR}/${script}"
  dest_path="${ARCHIVE_DIR}/${script}"
  
  if [ -f "$source_path" ]; then
    echo -e "Archiving ${YELLOW}${script}${NC}"
    cp "$source_path" "$dest_path"
    
    # Create a README in the archive with reason for archiving
    echo "# ${script}" > "${ARCHIVE_DIR}/${script}.README.md"
    echo "Archived on: $(date)" >> "${ARCHIVE_DIR}/${script}.README.md"
    echo "" >> "${ARCHIVE_DIR}/${script}.README.md"
    echo "## Reason for archiving" >> "${ARCHIVE_DIR}/${script}.README.md"
    
    case "$script" in
      "check-calibration-readiness.js")
        echo "This script was used for checking calibration prerequisites but is now superseded by the new DeepWiki Kubernetes integration approach." >> "${ARCHIVE_DIR}/${script}.README.md"
        ;;
      "enhanced-calibration.js")
        echo "This calibration script is outdated and will be replaced with a Kubernetes-aware calibration system that works with the DeepWiki deployment." >> "${ARCHIVE_DIR}/${script}.README.md"
        ;;
      "generate-detailed-report.js")
        echo "This reporting script was tied to the old calibration system. A new reporting mechanism will be implemented for the Kubernetes-based approach." >> "${ARCHIVE_DIR}/${script}.README.md"
        ;;
      "reset-calibration.js")
        echo "This reset script was designed for the old calibration system. A new reset mechanism will be created for the Kubernetes integration." >> "${ARCHIVE_DIR}/${script}.README.md"
        ;;
      *)
        echo "This script is outdated or no longer used in the current implementation." >> "${ARCHIVE_DIR}/${script}.README.md"
        ;;
    esac
    
    # Remove the original file
    rm "$source_path"
    echo -e "  ${GREEN}Archived successfully${NC}"
  else
    echo -e "  ${RED}Script not found: ${source_path}${NC}"
  fi
done

# Create an archive index file
cat > "${ARCHIVE_DIR}/README.md" << EOF
# Scripts Archive (May 2025)

This directory contains scripts that were archived on $(date) as part of the 
transition to the DeepWiki Kubernetes integration approach.

## Archived Scripts

$(for script in "${SCRIPTS_TO_ARCHIVE[@]}"; do echo "- \`${script}\`"; done)

## Reason for Archiving

These scripts were part of the previous calibration system that ran locally.
The new system integrates directly with DeepWiki running in our Kubernetes cluster,
making these scripts obsolete.

## New Approach

The new approach uses Kubernetes-native integration to:

1. Access DeepWiki directly in the cluster
2. Run analyses and calibration through the deployed instance
3. Store results in the vector database
4. Integrate with the three-tier analysis framework

For details on the new implementation, see the DeepWiki Kubernetes integration
documentation.
EOF

echo -e "\n${GREEN}Archiving complete!${NC}"
echo -e "See ${YELLOW}${ARCHIVE_DIR}/README.md${NC} for details on the archived scripts."
