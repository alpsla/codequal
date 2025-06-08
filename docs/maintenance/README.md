# CodeQual Maintenance Documentation

This directory contains maintenance documentation for the CodeQual system. The documentation is organized as follows:

## Core Documentation

- [**Model Management Procedures**](./model-management-procedures.md) - **Start here!** Comprehensive guide for all model-related operations including:
  - Model version updates
  - Calibration processes (full, continued, and targeted)
  - Configuration management
  - Troubleshooting

## Specialized Guides

- [**API Key Management**](./api-key-guide.md) - How to manage API keys for different model providers
- [**DeepSeek Integration**](./deepseek-integration-guide.md) - Specific guidance for DeepSeek Coder models
- [**DeepWiki Maintenance**](./deepwiki-maintenance.md) - How to maintain the DeepWiki integration

## Legacy Documents

The following documents are now consolidated into the main Model Management Procedures document:

- [~~Model Update Process~~](./model-update-process.md) - *Deprecated: See Model Management Procedures*
- [~~Full Calibration Process~~](./full-calibration-process.md) - *Deprecated: See Model Management Procedures*

## Updating Documentation

When updating procedures:

1. Always update the main Model Management Procedures document first
2. Add a note at the top of any specialized guides when changes might affect them
3. Update this README when adding new documentation

Last Updated: May 15, 2025

CI validation commands
Basic CI validation:
  bash scripts/validate-ci-local.sh

  Or for the other validation options:

  # Strict validation (no warnings allowed)
  bash scripts/validate-ci-local.sh --max-warnings 0

  # Fast validation (skip tests)  
  bash scripts/validate-ci-local.sh --skip-tests

  # Package-specific validation
  bash scripts/validate-ci-local.sh --package

  The script is warning about uncommitted changes. You can either commit the changes first or proceed with validation as-is. The script will still run the full
  CI validation process.