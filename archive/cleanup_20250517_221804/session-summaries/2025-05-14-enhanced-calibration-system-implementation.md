# Enhanced Calibration System for Model Selection

## Summary

Today we implemented an enhanced calibration system that dramatically improves CodeQual's ability to test and select optimal AI models for different types of repositories. The system now evaluates models based on multiple factors including quality, cost, and response time, with customizable weights to match specific organizational priorities.

## Key Improvements

1. **Multi-Factor Scoring System**
   - Models are now scored based on three key factors:
     - Quality (default 50% weight) - Accuracy and helpfulness of responses
     - Cost (default 35% weight) - Price efficiency based on token pricing
     - Speed (default 15% weight) - Response time performance
   - Customizable scoring weights via the `scoring-formula.js` module

2. **Streamlined Calibration Modes**
   - `quick` - Fast testing with mock APIs
   - `realistic` - More realistic testing with simulated delays
   - `full` - Testing with real API connections
   - New shell script `calibration-modes.sh` to easily switch between modes

3. **Comprehensive Data Collection**
   - New script `generate-comparison-data.sh` for collecting test data
   - Captures detailed metrics for all model/repository combinations
   - Outputs raw data for analysis in CSV and JSON formats

4. **Data Analysis Capabilities**
   - New `analyze-model-data.js` script for analyzing calibration results
   - Ability to experiment with different scoring weights
   - Detailed breakdown of how each factor contributes to the final score
   - Can identify optimal model selection under different organizational priorities

5. **Provider Skipping Support**
   - Ability to skip problematic providers (e.g., `SKIP_PROVIDERS="deepseek,google"`)
   - Handles API service disruptions gracefully

6. **Enhanced Error Handling**
   - More graceful handling of API errors
   - Better logging of error details
   - Automatic retries for transient errors

7. **Progress Tracking**
   - Real-time progress indicators during calibration
   - Estimated time remaining calculations
   - Summary reports of test results

## Implementation Details

1. **New Scripts**
   - `calibration-modes.sh` - Script for running different calibration modes
   - `validate-connection.js` - Script to validate the DeepWiki API connection
   - `get-api-info.js` - Script to gather information about API structure
   - `generate-comparison-data.sh` - Script for comprehensive data collection
   - `analyze-model-data.js` - Script for analyzing calibration results
   - `scoring-formula.js` - Module containing the scoring algorithm

2. **Enhanced Existing Scripts**
   - `run-calibration.js` - Added progress tracking, better error handling, and multi-factor scoring
   - `healthcheck.js` - Improved API connectivity detection

3. **Documentation**
   - Updated calibration system guide with detailed instructions
   - Added examples of different scoring approaches
   - Included troubleshooting information

## Sample Results

Our enhanced calibration system reveals interesting insights about model selection:

1. **Default Weights (50% Quality, 35% Cost, 15% Speed)**
   - OpenAI and Anthropic models score highest due to their superior quality scores
   - OpenAI generally scores highest for JavaScript and TypeScript repositories
   - Anthropic performs slightly better for Rust repositories

2. **Cost-Efficiency Focus (30% Quality, 60% Cost, 10% Speed)**
   - When cost efficiency is prioritized, DeepSeek models are consistently selected
   - Despite lower quality scores, the significant cost savings (70%+ lower than OpenAI) make them optimal

3. **Speed-Focused (40% Quality, 30% Cost, 30% Speed)**
   - When response time is prioritized, Google's Gemini models become more competitive
   - For some repositories, Anthropic models perform well due to balanced quality and speed

## How to Use

1. **Run Comprehensive Data Collection**
   ```bash
   cd packages/core/scripts/calibration
   ./generate-comparison-data.sh 4 realistic
   ```

2. **Analyze Results with Different Weights**
   ```bash
   # Default weights
   node analyze-model-data.js
   
   # Cost-focused
   node analyze-model-data.js --quality 0.3 --cost 0.6 --speed 0.1
   
   # Speed-focused
   node analyze-model-data.js --quality 0.4 --cost 0.3 --speed 0.3
   ```

3. **Apply Chosen Weights in Production**
   - Update `scoring-formula.js` with the preferred weights
   - Run calibration with `./calibration-modes.sh full`

## Next Steps

1. **Further Improve Quality Metrics**
   - Implement standardized code quality metrics
   - Add specific metrics for different repository types

2. **Add Repository-Specific Calibration**
   - Allow more fine-grained calibration for specific repositories
   - Consider repository architecture and complexity

3. **Visualization Dashboard**
   - Create a dashboard for visualizing model performance
   - Show tradeoffs between quality, cost, and speed

4. **Token Usage Optimization**
   - Add metrics for token efficiency
   - Optimize prompt design for different models

The enhanced calibration system provides a robust, data-driven approach to model selection that can be tailored to each organization's specific priorities, ensuring optimal balance between quality, cost, and performance.