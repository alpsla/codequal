# Batch Calibration Script

This script automates the calibration process across multiple models and categories without requiring individual confirmations for each test. It provides a more efficient way to calibrate your LLM integration.

## Features

- Tests all providers, models, and categories in a single run
- Batch mode that runs without manual confirmations
- Automatic configuration generation
- Robust API key handling with validation
- Saves progress after each test
- Calculates combined quality/speed scores
- Determines the best model for each language/size combination

## Usage

### Basic Usage

```bash
node packages/core/scripts/batch-calibration.js
```

### Batch Mode (No Prompts)

```bash
node packages/core/scripts/batch-calibration.js --batch
```

### Test Specific Language

```bash
node packages/core/scripts/batch-calibration.js --language=javascript
```

### Test Specific Size

```bash
node packages/core/scripts/batch-calibration.js --size=medium
```

### Only Generate Config from Existing Results

```bash
node packages/core/scripts/batch-calibration.js --generate-config
```

### Combined Options

```bash
node packages/core/scripts/batch-calibration.js --language=javascript --size=medium --batch
```

## Key Improvements

1. **API Key Handling**:
   - Properly loads and validates API keys from environment
   - Provides friendly error messages
   - Allows manual entry when environment variables fail

2. **Efficiency**:
   - Runs all tests without interruption
   - Saves progress after each test
   - Skips already completed tests when restarted

3. **Comprehensive Testing**:
   - Tests all categories for each model
   - Tests multiple repositories per language/size
   - Evaluates quality and speed

4. **Automatic Configuration**:
   - Determines best models based on combined scores
   - Generates ready-to-use configuration file
   - Includes fallbacks for all languages

## Results and Configuration

The script saves results to:
```
packages/core/scripts/calibration-results/batch-calibration-results.json
```

And generates a configuration file at:
```
packages/core/scripts/calibration-results/repository-model-config.ts
```

To apply the generated configuration:
```bash
cp packages/core/scripts/calibration-results/repository-model-config.ts packages/core/src/config/models/repository-model-config.ts
npm run build:core
```

## Notes

- For optimal results, test with all API keys configured
- The batch mode is ideal for unattended runs
- The script can be interrupted and resumed, as it saves progress
- Quality scores are based on multiple factors including content length, structure, and relevance
