# AI Model Calibration System

This directory contains scripts and utilities for calibrating the model selection system. The calibration process tests different AI models against various repositories to determine the optimal model configurations for different programming languages and repository sizes.

## Key Features

- **Direct Provider Integration**: Bypasses DeepWiki by directly connecting to provider APIs
- **Multi-factor Model Scoring**: Analyzes quality (50%), cost (35%), and speed (15%) with customizable weights
- **Comprehensive Reporting**: Generates both JSON and CSV reports for detailed analysis
- **Flexible Configuration**: Supports customizable testing parameters and provider selection

## Prerequisites

Before running calibration, ensure:

1. You have set up your `.env` file with the following variables:
   ```
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GOOGLE_API_KEY=AIza...
   DEEPSEEK_API_KEY=sk-...
   SUPABASE_URL=https://...
   SUPABASE_SERVICE_ROLE_KEY=eyJh...
   DEEPWIKI_API_URL=http://deepwiki-api.codequal-dev.svc.cluster.local:8001
   ```

2. Supabase database is accessible and has the required tables:
   - `calibration_results` - For storing raw calibration test results
   - `model_configurations` - For storing optimal model configurations

## Quick Start

1. Test provider connections first:
   ```bash
   node test-providers-directly.js
   ```

2. Run calibration with direct provider access:
   ```bash
   ./calibrate-with-direct-providers.sh
   ```

3. Analyze calibration results:
   ```bash
   node analyze-model-data.js
   ```

## Running Calibration

The calibration system provides different modes to accommodate various use cases:

### 1. Quick Test Mode

**Purpose**: Development and testing (takes seconds)

**Features**:
- Uses mock or direct API access with fast responses
- Tests only a single repository
- Tests only one provider (OpenAI)
- Single run per model

```bash
# Original DeepWiki-based quick test
./calibration-modes.sh quick

# Direct provider quick test
QUICK_TEST=true ./calibrate-with-direct-providers.sh
```

### 2. Realistic Test Mode

**Purpose**: Testing the full workflow with realistic timings (takes minutes)

**Features**:
- Tests all repositories
- Tests multiple providers
- Multiple runs per model

```bash
# Original DeepWiki-based realistic test
./calibration-modes.sh realistic

# Direct provider realistic test (2 repositories)
REPO_COUNT=2 ./calibrate-with-direct-providers.sh
```

### 3. Full Calibration Mode

**Purpose**: Production-quality calibration (takes hours)

**Features**:
- Tests all repositories
- Tests all providers
- Multiple runs per model
- Real-world response times

```bash
# Original DeepWiki-based full calibration
./calibration-modes.sh full

# Direct provider full calibration
REPO_COUNT=4 ./calibrate-with-direct-providers.sh
```

## Configuring Providers

You can selectively enable/disable providers:

```bash
# Skip specific providers (comma-separated list)
SKIP_PROVIDERS=deepseek,google ./calibrate-with-direct-providers.sh

# Custom runs per model (default: 1 for quick, 2 for full)
RUNS_PER_MODEL=3 ./calibrate-with-direct-providers.sh
```

## Analyzing Results

### Basic Analysis

Run the data analyzer to see model selection with the default scoring formula:
```bash
node analyze-model-data.js
```

### Custom Scoring Weights

Specify custom weights for quality, cost, and speed:
```bash
node analyze-model-data.js --quality 0.6 --cost 0.3 --speed 0.1
```

### Compare Multiple Scoring Variants

Run a comparison analysis with multiple weight combinations:
```bash
node analyze-scoring-variants.js
```

## Data Reports

After running calibration, several files are generated:

- `calibration-reports/all-models-data.csv`: Raw metrics for all models and repositories
- `calibration-reports/[repository]-[timestamp].json`: Detailed calibration results per repository
- `calibration-reports/[repository]-[timestamp].csv`: Per-repository CSV metrics
- `calibration-reports/variants/scoring-comparison.csv`: Comparison of different scoring formulas

## Troubleshooting

### Provider API Connection Issues

If you see connection issues with provider APIs:

1. Verify your API keys are correctly set in the environment
2. Check network connectivity to provider APIs
3. Use `node test-providers-directly.js` to test each provider individually
4. Skip problematic providers with `SKIP_PROVIDERS=provider1,provider2 ./calibrate-with-direct-providers.sh`

### DeepWiki API Connection Issues

If you see warnings about DeepWiki API connections:

1. In local development, this is normal - the API URL is only accessible within the Kubernetes cluster
2. Use direct provider access with `./calibrate-with-direct-providers.sh` instead
3. For DeepWiki calibration, run in a Kubernetes pod with access to the service

### Database Connection Issues

If you encounter database connection issues:

1. Check your Supabase credentials
2. Verify that the calibration tables exist
3. Use the direct-apply-calibration-tables.js script to create missing tables

### Long-Running Process

Full calibration can take several hours to complete:

1. Use `nohup` or similar to run in the background: `nohup ./calibrate-with-direct-providers.sh > calibration.log &`
2. Monitor the log file to check progress
3. The script will output a summary when complete

## Scripts Reference

| Script | Description |
|--------|-------------|
| `test-providers-directly.js` | Tests direct API connectivity to all providers |
| `calibrate-with-direct-providers.sh` | Main script to run calibration with direct API access |
| `analyze-model-data.js` | Analyzes calibration data with configurable weights |
| `analyze-scoring-variants.js` | Compares multiple scoring formulas |
| `scoring-formula.js` | Defines the scoring algorithm and default weights |
| `healthcheck.js` | Checks if all required environment variables and connections are properly set up |
| `run-calibration.js` | Original calibration script with DeepWiki integration |
| `continue-calibration.js` | Continues calibration from previous runs (only tests missing combinations) |