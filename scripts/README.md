# CodeQual Scripts

This directory contains the core scripts for the CodeQual project.

## Core Scripts

- **analyze_repository.sh**: Comprehensive repository analysis with fallback mechanism
  - Usage: `./Scripts/analyze_repository.sh <repository_url> [model_name]`
  - Analyzes architecture, code quality, security, dependencies, and performance
  - Generates reports in the reports directory with timestamps

- **quick_test.sh**: Quick test for the DeepWiki OpenRouter integration
  - Usage: `./Scripts/quick_test.sh [repository_url] [model_name]`
  - Useful for checking if the integration is working

- **setup.sh**: Project setup script
  - Usage: `./Scripts/setup.sh`
  - Sets up dependencies and configurations

- **build-packages.sh**: Build all project packages
  - Usage: `./Scripts/build-packages.sh`
  - Builds all packages in the correct dependency order

- **clean-install.sh**: Clean installation of dependencies
  - Usage: `./Scripts/clean-install.sh`
  - Removes node_modules and reinstalls all dependencies

## Output Reports

Reports are generated in the `/reports` directory with timestamps for each run.
The latest report is always available at `/reports/latest`.

## Documentation

For detailed documentation on using these scripts, see the project's 
documentation in the `/docs` directory.
