# Model Validation and Calibration Guide

This guide outlines the recommended process for validating LLM models and performing a comprehensive calibration to ensure the best configuration for CodeQual.

## Step 1: Model Validation

First, run the model validation script to quickly check which models are working:

```bash
node packages/core/scripts/validate-models.js
```

This script:
- Tests each model with a simple prompt
- Verifies API keys and connectivity
- Shows which models are working and which are failing
- Saves a detailed results file

### Key Features
- Option to manually input API keys
- Quick testing (typically under 1 minute per model)
- Discovers available models from providers
- Detailed error reporting

## Step 2: Comprehensive Calibration

After validating which models work, run the comprehensive calibration:

```bash
node packages/core/scripts/comprehensive-calibration.js
```

For targeted testing of specific languages or sizes:

```bash
node packages/core/scripts/comprehensive-calibration.js --language=javascript --size=medium
```

The calibration process:
- Tests each working model against multiple repositories
- Assesses performance across different categories
- Evaluates both quality and speed metrics
- Generates an optimal configuration

### Recommended Testing Approach

1. **Start with a Single Language/Size**: 
   Test thoroughly with one language/size combination first
   ```bash
   node packages/core/scripts/comprehensive-calibration.js --language=javascript --size=medium
   ```

2. **Expand Testing**:
   Once confident in the approach, expand to more languages and sizes
   ```bash
   node packages/core/scripts/comprehensive-calibration.js
   ```

3. **Generate Final Configuration**:
   After all testing is complete (which may take several hours):
   ```bash
   node packages/core/scripts/comprehensive-calibration.js --generate-config
   ```

4. **Apply the Configuration**:
   ```bash
   cp packages/core/scripts/calibration-results/repository-model-config.ts packages/core/src/config/models/repository-model-config.ts
   npm run build:core
   ```

## Tips for Effective Calibration

1. **Patience Is Key**: A thorough calibration can take hours, but the results are worth it
2. **Resume Capability**: The calibration scripts save after each test and can resume where they left off
3. **Manual Adjustment**: Feel free to manually adjust the final configuration based on specific needs
4. **API Costs**: Be aware of API usage costs when running extensive calibration tests

## Troubleshooting

- **API Key Issues**: Use the validation script to test keys before lengthy calibration
- **Format Errors**: Some providers require specific message formats (fixed in the scripts)
- **Rate Limiting**: If you encounter rate limits, wait a while before resuming
