# Enhanced Model Calibration System

This system provides a comprehensive approach to calibrating AI models for repository analysis, with direct API access to all major providers and detailed performance metrics.

## Key Features

- **Multi-provider Support**: Tests all major model providers (OpenAI, Anthropic, Google, DeepSeek, OpenRouter)
- **Multi-factor Scoring**: Analyzes quality (50%), cost (35%), and speed (15%) with customizable weights
- **Comprehensive Reports**: Generates detailed reports in both CSV and JSON formats
- **Database Integration**: Updates model configurations in Supabase tables
- **Flexible Calibration Modes**: Quick, realistic, and full testing options

## Prerequisites

Before running calibration, ensure:

1. You have set up your `.env` file with required API keys:
   ```
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GOOGLE_API_KEY=AIza...
   DEEPSEEK_API_KEY=sk-...
   OPENROUTER_API_KEY=sk-or-...
   SUPABASE_URL=https://...
   SUPABASE_SERVICE_ROLE_KEY=eyJh...
   ```

2. NodeJS and npm/yarn are installed on your system.

## Calibration Modes

The enhanced calibration system provides three primary modes:

### 1. Quick Mode

**Purpose**: Development and testing (takes minutes)

**Features**:
- Tests a single small repository
- Tests all providers with short responses
- Single run per model
- Limited token output (500 tokens)

```bash
./run-enhanced-calibration.sh quick
```

### 2. Realistic Mode

**Purpose**: Testing with realistic parameters (takes ~1 hour)

**Features**:
- Tests two repositories (small and medium)
- Tests all providers with medium-length responses
- Two runs per model for better data
- Updates the database with results

```bash
./run-enhanced-calibration.sh realistic
```

### 3. Full Mode

**Purpose**: Production-grade calibration (takes several hours)

**Features**:
- Tests all repositories (small, medium, large)
- Tests all providers with full-length responses
- Three runs per model for robust data
- Updates the database with complete results

```bash
./run-enhanced-calibration.sh full
```

## Customizing Calibration

The calibration system supports various customization options:

### Skip Specific Providers

```bash
./run-enhanced-calibration.sh quick --skip-providers=deepseek,openrouter
```

### Customize Score Weights

```bash
./run-enhanced-calibration.sh realistic --quality=0.6 --cost=0.3 --speed=0.1
```

### Limit Repository Count

```bash
./run-enhanced-calibration.sh full --repo-count=2
```

## Analyzing Results

After calibration, several outputs help you analyze the results:

### 1. Terminal Summary

The script outputs a summary showing:
- Best model for each repository
- Total test count and success rate
- Time taken for calibration

### 2. CSV Data

CSV files are generated in `calibration-reports/`:
- `all-models-data.csv`: Contains raw metrics for all models across all repositories
- Individual repository CSV files with detailed metrics

### 3. Full Reports

Markdown reports are generated in `reports/`:
- Complete analysis of each repository
- Recommendations by language and repository size
- Cost analysis comparing providers

### 4. Model Response Samples

Each model response is saved in `reports/` with:
- Full model output
- Quality score
- Token usage
- Cost information

## Database Integration

When running with `--update-db` flag, the system:
1. Updates the `model_configurations` table with optimal models
2. Records detailed test results in the `calibration_results` table
3. Stores full calibration data for future analysis

## Troubleshooting

### API Key Issues

If you encounter API key errors:
1. Verify your API keys in the `.env` file
2. Use `--skip-providers` to exclude problematic providers
3. Check for API rate limits (especially in full mode)

### Performance Issues

For long-running calibrations:
1. Use `nohup ./run-enhanced-calibration.sh full > calibration.log &` to run in background
2. Use `--repo-count` to limit repositories being tested
3. Use `--skip-providers` to exclude slower providers

### Database Connection Issues

If database updates fail:
1. Verify your Supabase credentials
2. Check that the required tables exist
3. Run without the `--update-db` flag to skip database operations

## Advanced Usage

### Direct Script Access

For programmatic access or more control:

```javascript
const { runCalibration } = require('./enhanced-calibration');

// Run with custom options
runCalibration({
  mode: 'realistic',
  runsPerModel: 2,
  max_tokens: 1000,
  updateDatabase: true,
  skipProviders: 'deepseek',
  qualityWeight: 0.6,
  costWeight: 0.3,
  speedWeight: 0.1
})
.then(result => {
  console.log(`Calibration complete with ${result.successfulTests} successful tests`);
})
.catch(error => {
  console.error('Calibration failed:', error);
});
```

### Adding New Providers

To add a new provider:
1. Add the provider configuration to `MODEL_CONFIGS` array
2. Implement a client function in `providerClients` object
3. Add provider handling in the `testModel` function switch statement