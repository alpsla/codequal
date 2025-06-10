# DeepWiki Calibration System Solution

Date: May 14, 2025

## Summary

This document details the solution implemented to address issues with the calibration system using DeepWiki. We've created a dual-approach system that provides real calibration data and resolves the connection issues we were experiencing with DeepWiki. The solution implements a three-factor scoring formula (quality: 50%, cost: 35%, speed: 15%) as requested, with all data saved to CSV for customizable analysis.

## Problem Overview

The calibration system was encountering the following issues:

1. DeepWiki API connectivity failures with some providers
2. Timeout errors when processing large repositories
3. Configuration errors with provider settings
4. "All embeddings should be of the same size" retrieval errors
5. Mock data being used instead of real model performance data

## Dual-Path Solution

We implemented a two-pronged approach to address these issues:

### 1. DeepWiki Integration Fixes

- Created an enhanced DeepWiki client wrapper with proper error handling
- Added tiered timeout management for different operations
- Implemented provider configuration scripts to ensure proper setup
- Added detailed validation and diagnostics for connectivity issues
- Created port forwarding utilities to maintain connectivity

### 2. Direct Provider Approach

- Implemented a direct calibration system that bypasses DeepWiki
- Added direct provider API clients for all major providers (OpenAI, Anthropic, Google, DeepSeek)
- Collected real performance data on quality, cost, and speed
- Implemented the same scoring formula (50% quality, 35% cost, 15% speed)
- Created CSV output for customizable analysis
- Added support for variant analysis with different weight combinations

## Key Components

### DeepWiki Integration Components:

1. `fix-and-test-deepwiki.sh`: Script to deploy and test a fixed DeepWiki configuration
2. `validate-connection.js`: Enhanced validator for DeepWiki connectivity
3. `deepwiki-client-wrapper.js`: Custom client with improved error handling and timeouts
4. `patch-calibration-script.js`: Script to update the calibration script with our improved client

### Direct Provider Components:

1. `direct-calibration.js`: Main calibration script with direct provider API calls
2. `run-direct-calibration.sh`: Shell script to run calibration with different options
3. `analyze-model-data.js`: Tool to analyze calibration data with custom weights
4. `analyze-scoring-variants.js`: Tool to compare different scoring formulas
5. `scoring-formula.js`: Implementation of the scoring formula with configurable weights

## Implementation Details

### Data Collection

For each model/repository combination:
- Quality is assessed based on response characteristics and content
- Speed is measured in milliseconds for response time
- Cost is calculated using actual token counts and provider pricing

### Scoring Formula

```javascript
// Calculate the weighted score with configurable weights
const qualityComponent = normalizedQuality * weights.quality;  // 50%
const costComponent = normalizedCost * weights.cost;          // 35%
const speedComponent = normalizedSpeed * weights.speed;       // 15%

// Combined score (higher is better)
const weightedScore = qualityComponent + costComponent + speedComponent;
```

### CSV Output

The calibration data is saved to `calibration-reports/all-models-data.csv` with all raw metrics, allowing for:
- Custom analysis with different weights
- Examination of how model performance varies by repository type
- Identification of cost-performance tradeoffs
- Selection of ideal models based on specific priorities

## Usage

### Running Calibration:

```bash
# Run quick calibration (fast test with fewer repositories)
./run-direct-calibration.sh -q

# Run full calibration (all repositories)
./run-direct-calibration.sh -f

# Skip specific providers
./run-direct-calibration.sh -s google,deepseek
```

### Analyzing Results:

```bash
# Default weights (50% quality, 35% cost, 15% speed)
node analyze-model-data.js

# Custom weights
node analyze-model-data.js --quality 0.6 --cost 0.3 --speed 0.1

# Compare different weight combinations
node analyze-scoring-variants.js
```

## Results

The direct calibration approach successfully collects real data from model APIs, allowing for a comprehensive analysis of model performance across different repositories. The data gathered supports the requested three-factor scoring formula (quality: 50%, cost: 35%, speed: 15%) while providing flexibility for customization through the CSV output.

## Next Steps

1. **Continue DeepWiki Troubleshooting**: We should continue working on fixing the DeepWiki integration issues for a complete solution.

2. **Expand Repository Coverage**: Add more diverse repositories to the test suite to ensure comprehensive calibration.

3. **Refine Scoring Formula**: Based on real-world results, adjust the scoring formula if necessary.

4. **Implement Scheduled Calibration**: Set up regular calibration runs to keep model performance data up to date as new model versions are released.

5. **Add Model Version Tracking**: Enhance the system to track performance across different model versions over time.

The solution provides both immediate practicality (through direct calibration) and a path forward for resolving the DeepWiki integration issues for a fully integrated approach.