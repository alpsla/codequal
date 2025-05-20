# DeepWiki Testing and Integration Plan

## Current Status

We've created a comprehensive suite of testing tools to evaluate DeepWiki's performance for repository analysis. These tools will help us determine the optimal model configurations for different languages and repository sizes.

## Testing Framework

The testing framework consists of several key scripts:

1. **Comprehensive Test Script** (`comprehensive-test.sh`)
   - Tests multiple models on a single repository 
   - Generates detailed reports comparing performance
   - Includes metrics for response time and size

2. **Multi-Repository Test Script** (`run-full-tests.sh`)
   - Tests various repositories of different languages and sizes
   - Works with all available API providers (OpenAI, Google, Anthropic, OpenRouter)
   - Automatically adapts to available API keys

3. **OpenRouter Test Script** (`test-openrouter.sh`)
   - Specifically tests Claude models via OpenRouter
   - Provides an alternative when direct Anthropic API access isn't available

4. **Analysis Script** (`analyze-results.sh`)
   - Analyzes test results to generate scores for each model
   - Produces comprehensive HTML reports with visualizations
   - Determines optimal model configurations by language and size

5. **API Key Check Script** (`check-api-keys.js`)
   - Validates API key availability from environment variables
   - Helps troubleshoot API key configuration issues

## How to Complete the Testing

To complete the testing and generate the necessary data for integration:

1. **Set Up API Keys**
   ```bash
   # Add to .env file in project root
   OPENAI_API_KEY=your_openai_key
   GOOGLE_API_KEY=your_google_key
   ANTHROPIC_API_KEY=your_anthropic_key  # Optional
   OPENROUTER_API_KEY=your_openrouter_key
   ```

2. **Verify API Keys**
   ```bash
   node /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/check-api-keys.js
   ```

3. **Run Multi-Repository Tests**
   ```bash
   bash /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/run-full-tests.sh
   ```
   This will:
   - Test multiple repositories across different languages and sizes
   - Use all available API keys for comprehensive model testing
   - Generate detailed performance metrics
   - Automatically run the analysis script to evaluate results

4. **Review Test Results**
   - Check the generated HTML reports in the `analysis-results` directory
   - Analyze performance by language, size, and model
   - Identify the best model configurations for each scenario

## Implementation Status

We've already implemented the enhanced DeepWikiClient with:

1. **Adaptive Model Selection**
   - Language and size-specific model configuration
   - API key availability detection
   - Intelligent fallbacks when preferred providers are unavailable

2. **Error Handling**
   - Comprehensive error handling for API failures
   - Graceful fallbacks for authentication issues
   - Detailed logging for troubleshooting

3. **Large Repository Handling**
   - Chunked analysis strategy for large repositories
   - Repository size detection
   - Optimized model selection for large codebases

4. **Integration Helpers**
   - Simplified initialization with the `initializeDeepWikiIntegration` function
   - Environment variable loading for API keys
   - Type-safe interfaces for all components

## Next Steps

After completing the testing:

1. **Update Model Configurations**
   - Use the test results to update the `MODEL_CONFIGS` in `DeepWikiClient.final.ts`
   - Ensure optimal model selection for each language and size category

2. **Finalize DeepWikiClient Implementation**
   - Rename `DeepWikiClient.final.ts` to `DeepWikiClient.ts` once testing is complete
   - Add any additional optimizations based on test findings

3. **Proceed with Integration**
   - Develop the Context Provider to connect with multi-agent system
   - Implement the three-tier analysis integration
   - Create the necessary UI components for analysis depth selection

## Quick Start

To quickly get started with testing:

```bash
# Make scripts executable
bash /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/make-full-tests-executable.sh

# Check API keys
node /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/check-api-keys.js

# Run tests with available API keys
bash /Users/alpinro/Code\ Prjects/codequal/packages/core/src/deepwiki/run-full-tests.sh
```

The results will determine the optimal integration approach for connecting DeepWiki with the multi-agent orchestrator.
