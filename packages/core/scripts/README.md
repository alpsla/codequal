# CodeQual Scripts

This directory contains utility scripts for the CodeQual project. These scripts help with model validation, calibration, and configuration management.

## Primary Scripts

### Enhanced Calibration

```bash
./scripts/enhanced-calibration.js
```

This is the main script for running model calibration with enhanced features:
- Support for multiple AI providers (Anthropic, OpenAI, Google, DeepSeek, OpenRouter)
- Tests against real GitHub repositories with different languages and sizes
- Weighted scoring system (Quality: 50%, Speed: 15%, Price: 35%)
- Manual API key override options
- Detailed CSV report generation

Options:
- `--language=python` - Test only Python repositories
- `--size=small` - Test only small repositories
- `--provider=google` - Test only Google models
- `--model=gpt-4o` - Test only models with 'gpt-4o' in the name
- `--force` - Force retest of all models
- `--generate-config` - Generate config from existing results
- `--generate-report` - Generate CSV report from existing results
- `--skip-api-validation` - Skip API key validation

### Report Generation

```bash
./scripts/generate-detailed-report.js
```

Generates comprehensive CSV reports from calibration results for analysis.

## Modular Architecture

The Enhanced Calibration system follows a modular architecture:

```
scripts/
├── modules/
│   └── enhanced-calibration/
│       ├── config.js      # Configuration constants
│       ├── utils.js       # Helper functions
│       ├── api.js         # API interaction functions
│       ├── runner.js      # Main implementation
│       └── README.md      # Documentation
├── enhanced-calibration.js # Main entry point
└── generate-detailed-report.js
```

This modular approach improves maintainability, readability, and makes it easier to extend the system in the future.

## Recommended Workflow

1. **Run Enhanced Calibration for a Single Language/Size**
   ```bash
   ./scripts/enhanced-calibration.js --language=javascript --size=medium
   ```
   This focused test will help confirm the calibration is working correctly

2. **Run Full Enhanced Calibration**
   ```bash
   ./scripts/enhanced-calibration.js
   ```
   This will test all languages and sizes, which may take several hours

3. **Apply the Configuration**
   ```bash
   cp scripts/calibration-results/repository-model-config.ts src/config/models/repository-model-config.ts
   npm run build
   ```

## Archived Scripts

To maintain a clean directory structure, outdated scripts have been moved to the `archived-scripts` directory:

- **Calibration Scripts**: Previous calibration implementations
  - `multi-provider-calibration.js`
  - `targeted-calibration.js`
  - `batch-calibration.js`
  - `comprehensive-calibration.js`
  - `simple-calibration.js`
  - `simple-batch-calibration.js`

- **Utility Scripts**: Older utility tools
  - API testing and validation tools
  - Environment checking tools
  - Debug helpers

- **Documentation**: Legacy documentation files

When creating new scripts, please follow the modular architecture pattern and ensure they have proper documentation.