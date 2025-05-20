# Model Calibration System Guide

This guide explains how to use the calibration system to optimize model selection for different repositories. The system analyzes model performance across three key metrics: quality, cost, and speed.

## Overview

The calibration system provides two main approaches:

1. **DeepWiki Integration**: Uses DeepWiki for repository analysis and model comparison
2. **Direct Provider Calibration**: Directly calls provider APIs for more reliable calibration

Both approaches use the same scoring formula by default:
- Quality: 50%
- Cost: 35% 
- Speed: 15%

## Getting Started

### Prerequisites

Before running calibration, ensure you have:

1. API keys for the providers you want to test
   - OPENAI_API_KEY
   - ANTHROPIC_API_KEY
   - GOOGLE_API_KEY
   - DEEPSEEK_API_KEY

2. These keys should be in your environment or `.env` file

### Running Calibration

#### Option 1: Automatic Mode (Recommended)

The system will automatically detect the best calibration approach:

```bash
cd packages/core/scripts/calibration/
./run-direct-calibration.sh -q  # Quick test
./run-direct-calibration.sh -f  # Full calibration
```

The script will:
1. Check if DeepWiki connection is available
2. Offer to use either DeepWiki or direct calibration
3. Skip providers with missing API keys
4. Run calibration and save results

#### Option 2: DeepWiki Calibration

If you specifically want to use DeepWiki:

```bash
cd packages/core/scripts/calibration/
./ensure-deepwiki-connection.sh  # Ensure DeepWiki is accessible
./calibration-modes.sh quick     # Quick test
./calibration-modes.sh full      # Full calibration
```

#### Option 3: Direct Provider Calibration

If you specifically want to use direct provider calibration:

```bash
cd packages/core/scripts/calibration/
./run-direct-calibration.sh -q  # Quick test
./run-direct-calibration.sh -f  # Full calibration
```

### Command Line Options

#### For run-direct-calibration.sh:

```
-q, --quick           Run in quick mode (one repo, one provider)
-f, --full            Run in full mode (all repos, all providers)
-s, --skip <list>     Skip providers (comma-separated: openai,anthropic,google,deepseek)
-a, --analyze         Run analysis after calibration
-v, --variants        Run variant analysis (different scoring weights)
-h, --help            Show this help message
```

#### For calibration-modes.sh:

```
quick     - Quick test with mock API (1-3 second responses, one repo)
realistic - Realistic test with mock API but longer delays (30-90 seconds)
full      - Full calibration with real API connection (several hours)
validate  - Only validate the DeepWiki API connection without running calibration
info      - Get information about the DeepWiki API endpoints and structure
help      - Show this help message
```

## Analyzing Results

### 1. View Raw Data

The calibration data is saved to CSV without built-in formulas:

```bash
cd packages/core/scripts/calibration/
cat calibration-reports/all-models-data.csv
```

This allows you to analyze the data with your own custom formulas in a spreadsheet application.

### 2. Run Analysis with Default Formula

To analyze the data using the default formula (50% quality, 35% cost, 15% speed):

```bash
node analyze-model-data.js
```

### 3. Run Analysis with Custom Weights

To analyze with custom weights:

```bash
node analyze-model-data.js --quality 0.6 --cost 0.3 --speed 0.1
```

### 4. Compare Different Formulas

To see how different weight combinations affect model selection:

```bash
node analyze-scoring-variants.js
```

## Troubleshooting

### DeepWiki Connection Issues

If you encounter DeepWiki connection problems:

1. Check port forwarding:
   ```bash
   ./ensure-deepwiki-connection.sh
   ```

2. If that doesn't fix it, use direct calibration:
   ```bash
   ./run-direct-calibration.sh -q
   ```

### API Key Issues

If an API key is missing or invalid, the system will automatically skip that provider. To manually specify providers to skip:

```bash
./run-direct-calibration.sh -q -s deepseek,google
```

### Performance Issues

For quicker results, use the quick mode:

```bash
./run-direct-calibration.sh -q
```

## Advanced Usage

### Custom Repositories

To modify the repositories used for calibration, edit the `ALL_CALIBRATION_REPOSITORIES` array in:
- `direct-calibration.js` (for direct calibration)
- `run-calibration.js` (for DeepWiki calibration)

### Custom Scoring Formula

To modify the scoring formula permanently, edit:
- `scoring-formula.js`

The formula weighs three normalized factors:
- Quality (model response quality)
- Cost (price per token)
- Speed (response time)

## Understanding the Output

### CSV Format

The CSV output includes the following columns:

- `repository`: Repository identifier
- `language`: Programming language
- `size_category`: Size category (small/medium/large)
- `provider`: LLM provider (openai/anthropic/google/deepseek)
- `model`: Model name
- `weighted_score`: Combined score (higher is better)
- `quality_score`: Quality score (0-1)
- `response_time_ms`: Response time in milliseconds
- `cost_estimate`: Estimated cost per request
- `quality_component_raw`: Raw quality data
- `cost_component_raw`: Raw cost data
- `speed_component_raw`: Raw speed data
- `timestamp`: When the test was run

### Best Model Selection

The best model is selected based on the highest weighted score. This represents the optimal balance between quality, cost, and speed according to the weights used.

The default weights (50/35/15) prioritize quality most highly, followed by cost, with speed as the least important factor. This aligns with the typical priorities for model selection in repository analysis tasks.