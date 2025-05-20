# Using the Final No-Prompt Calibration Script

This script has been created to address issues with API authentication and calibration. It includes:

1. **Hardcoded Anthropic API key**
2. **No user prompts or confirmations needed**
3. **Tests all categories automatically**
4. **Saves progress after each test**

## Usage

Simply run:

```bash
node packages/core/scripts/final-no-prompt-calibration.js
```

This will run the complete calibration process with no prompts required.

## Key Features

- **Proper Anthropic API Format**: The script correctly formats API calls for Anthropic by combining system and user prompts
- **Error Handling**: Continues with other tests even if some fail
- **Progress Saving**: Can be restarted if interrupted
- **Configuration Generation**: Creates the final configuration file when complete

## After Completion

Once the calibration is complete, the script will generate a configuration file at:

```
packages/core/scripts/calibration-results/repository-model-config.ts
```

Apply this configuration with:

```bash
cp packages/core/scripts/calibration-results/repository-model-config.ts packages/core/src/config/models/repository-model-config.ts
npm run build:core
```

## Generating Configuration Only

If you already have results and just want to generate the configuration:

```bash
node packages/core/scripts/final-no-prompt-calibration.js --generate-config
```
