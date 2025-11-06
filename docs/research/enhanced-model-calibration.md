# Enhanced Model Calibration System

**Last Updated: May 14, 2025**

## Overview

We've enhanced the model calibration system to address several issues observed in the initial calibration results:

1. **Model Selection Updates**:
   - Removed Gemini 1.5 models (Flash and Pro)
   - Added Gemini 2.5 models (Pro, Pro Preview, and Flash)
   - Updated model IDs to match current Google AI API standards

2. **Scoring System Improvements**:
   - Modified the weighting formula for model evaluation:
     - Quality: 50% (previously 70%)
     - Speed: 15% (previously 30%)
     - Price: 35% (new factor)
   - This change ensures we select models that offer the best balance of quality, performance, and cost,
     with price now being a major decision factor (only slightly less important than quality)

3. **API Key Management**:
   - Added support for manual API key overrides when automatic authentication fails
   - Implemented interactive key collection during calibration
   - Added detailed error logging for API issues

4. **CSV Reporting**:
   - Added comprehensive tabular reporting for manual analysis
   - Generates detailed CSV with all metrics for every model/repository combination
   - Includes individual category scores, response times, and pricing information
   - Allows manual verification of the automated selection logic

## Usage Instructions

### Basic Calibration Run

```bash
# Install dependencies if not already installed
npm install axios dotenv

# Run calibration with all defaults
node packages/core/scripts/enhanced-calibration.js

# Skip API validation if needed
node packages/core/scripts/enhanced-calibration.js --skip-api-validation
```

### Targeted Calibration

```bash
# Test specific language
node packages/core/scripts/enhanced-calibration.js --language=javascript

# Test specific size category
node packages/core/scripts/enhanced-calibration.js --size=medium

# Test specific provider
node packages/core/scripts/enhanced-calibration.js --provider=google

# Test specific model
node packages/core/scripts/enhanced-calibration.js --model=gemini-2.5-pro
```

### Configuration Generation

```bash
# Only generate configuration from existing results
node packages/core/scripts/enhanced-calibration.js --generate-config

# Force retest of all models (ignore cached results)
node packages/core/scripts/enhanced-calibration.js --force
```

### Generating Reports

```bash
# Only generate CSV report from existing results
node packages/core/scripts/enhanced-calibration.js --generate-report

# Generate both CSV report and configuration
node packages/core/scripts/enhanced-calibration.js --generate-report --generate-config
```

## Gemini 2.5 Models

We now use the following Gemini 2.5.0 models:

1. **gemini-2.5-pro**
   - Base version with automatic updates
   - Ideal for complex reasoning tasks
   - Input: $1.75/1M tokens, Output: $14.00/1M tokens

2. **gemini-2.5-pro-preview-05-06**
   - Version locked to the May 2025 preview release
   - Used for reproducibility and benchmarking
   - Same pricing as base version

3. **gemini-2.5-flash**
   - Lightweight, cost-effective model
   - Best for simpler tasks and budget constraints
   - Input: $0.30/1M tokens, Output: $1.25/1M tokens

## Scoring Logic

The new scoring system combines three factors:

```javascript
// Quality score (50% weight)
const avgQuality = totalQuality / categoryCount;

// Speed score (15% weight)
const speedScore = Math.max(0, 10 - (avgResponseTime / 3));

// Price score (35% weight)
const priceScore = calculatePriceScore(provider, model);

// Combined score calculation
const combinedScore = (avgQuality * 0.50) + (speedScore * 0.15) + (priceScore * 0.35);
```

This formula ensures that:
- Quality remains an important factor but is now weighted just slightly higher than price
- Speed has a reduced impact on the final score
- Price is now a major consideration, favoring cost-effective models

## CSV Report Format

The detailed CSV report includes the following columns:

1. **Repository Context**
   - Language
   - Size (small, medium, large)
   - Repository name

2. **Model Information**
   - Provider (e.g., google, anthropic, openai)
   - Model (e.g., gemini-2.5-pro, claude-3.7-sonnet)

3. **Aggregated Scores**
   - Quality Score (0-10)
   - Speed Score (0-10)
   - Price Score (0-10)
   - Combined Score (0-10)

4. **Category Scores**
   - Architecture Score (0-10)
   - Code Quality Score (0-10)
   - Security Score (0-10)
   - Best Practices Score (0-10)
   - Performance Score (0-10)

5. **Performance Metrics**
   - Average Response Time (seconds)
   - Content Size (bytes)

6. **Pricing Information**
   - Input Price ($/1M tokens)
   - Output Price ($/1M tokens)

7. **Best Model Indicators**
   - Best Model For Repo (YES/empty)
   - Best Model For Lang/Size (YES/empty)

This format allows for easy filtering, sorting, and analysis in spreadsheet applications or data analysis tools.

## API Key Management

When encountering API authentication issues:

1. The script will detect common error patterns (e.g., "authentication", "unauthorized", "API key")
2. It will prompt you to provide a manual API key for the specific model
3. If provided, it will retry the current operation with the new key
4. All manual keys are stored in memory for the duration of the script run

Example interaction:
```
API key issue detected for google/gemini-2.5-pro
Would you like to provide a manual API key? (y/n): y
Enter API key for google/gemini-2.5-pro: AIza...
Manual API key for google/gemini-2.5-pro has been set
Retrying architecture with manual API key...
```

## Results and Reports

The calibration process generates several outputs:

1. **Enhanced Calibration Results**:
   - Location: `packages/core/scripts/calibration-results/enhanced-calibration-results.json`
   - Contains detailed results for all tested models, including:
     - Quality scores by category
     - Response times
     - Price scores
     - Combined scores

2. **Detailed CSV Report**:
   - Location: `packages/core/scripts/calibration-results/detailed-calibration-report.csv`
   - Comprehensive tabular data for manual analysis and verification
   - Can be opened in Excel, Google Sheets, or any spreadsheet application

3. **Configuration File**:
   - Location: `packages/core/scripts/calibration-results/repository-model-config.ts`
   - Generated TypeScript configuration ready for use in the system

4. **Error Log**:
   - Location: `packages/core/scripts/calibration-results/calibration-errors.log`
   - Detailed logs of any errors encountered during calibration

## Next Steps

After running calibration:

1. Review the results and error logs
2. Open the CSV report to manually analyze results and verify calibration logic
3. Copy the generated configuration to the core package:
   ```bash
   cp packages/core/scripts/calibration-results/repository-model-config.ts packages/core/src/config/models/
   ```
4. Rebuild the core package:
   ```bash
   npm run build:core
   ```
5. Test the system with the new configuration
