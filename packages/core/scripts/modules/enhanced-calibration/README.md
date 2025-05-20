# Enhanced Calibration System

This directory contains the modular implementation of the Enhanced Calibration System, which provides a comprehensive framework for testing and evaluating various AI models from different providers against repository analysis tasks.

## Key Features

- Supports multiple AI providers (Anthropic, OpenAI, Google, DeepSeek, OpenRouter)
- Tests models against real GitHub repositories with different languages and sizes
- Evaluates models using a weighted scoring system:
  - Quality: 50% (based on detailed evaluation of content)
  - Speed: 15% (response time performance)
  - Price: 35% (cost efficiency based on token pricing)
- Provides manual API key override options for models with authentication issues
- Generates detailed CSV reports for analysis
- Produces configuration files for automatic model selection

## Module Structure

The system is organized into several modules for better maintainability:

- **config.js**: Configuration constants and repository test data
- **utils.js**: Helper functions for file operations, command-line arguments, etc.
- **api.js**: Functions for API interactions and handling manual API keys
- **runner.js**: The main implementation of the calibration process

## Usage

The system is designed to be invoked from the main `enhanced-calibration.js` script, which provides a convenient command-line interface with the following options:

```
./enhanced-calibration.js                   - Run full calibration
./enhanced-calibration.js --language=python - Test only Python repositories
./enhanced-calibration.js --size=small      - Test only small repositories
./enhanced-calibration.js --provider=google - Test only Google models
./enhanced-calibration.js --model=gpt-4o    - Test only models with 'gpt-4o' in the name
./enhanced-calibration.js --force           - Force retest of all models
./enhanced-calibration.js --generate-config - Generate config from existing results
./enhanced-calibration.js --generate-report - Generate CSV report from existing results
./enhanced-calibration.js --skip-api-validation - Skip API key validation
```

## Development

When extending or modifying the system, please follow these guidelines:

1. Keep the modular structure intact - add new functionality to the appropriate modules
2. Update the configuration constants in `config.js` when adding new test repositories or models
3. Add appropriate error handling for any new functionality
4. Document any new features in the main script's usage section

## Results

The system saves results to the `calibration-results` directory, including:
- Raw calibration results (JSON)
- Detailed CSV reports
- Generated model configurations