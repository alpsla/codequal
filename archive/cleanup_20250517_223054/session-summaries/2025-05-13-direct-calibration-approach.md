# May 13, 2025 - Direct Model Calibration Approach

## DeepWiki API Build Issues

After attempting to set up and use DeepWiki for our calibration process, we encountered significant challenges:

1. Docker daemon connection issues (Docker/Colima not running)
2. DeepWiki build failures related to FAISS library
3. 404 errors on all attempted API endpoints

Rather than continuing to troubleshoot DeepWiki, we've created a more reliable alternative approach that directly calls the model provider APIs.

## Direct Calibration Approach

The new direct calibration script (`run-direct-calibration.js`) eliminates the DeepWiki dependency and instead:

1. Fetches repository information directly from GitHub API
2. Constructs an appropriate context for each model
3. Calls the relevant model provider APIs directly with this context
4. Processes and scores the results in the same way as the original script

### Key Advantages

- **Reliability**: No dependency on external services like DeepWiki
- **Simplicity**: Direct API calls are easier to debug and maintain
- **Performance**: Potentially faster calibration with fewer layers
- **Flexibility**: Easy to adjust prompts and repository context as needed
- **Resilience**: Better error handling and recovery
- **Efficiency**: Caches repository information to minimize GitHub API calls

## Implementation Details

The direct calibration script includes:

1. **Repository Context Builder**: Fetches repo information, files, and README from GitHub
2. **Provider-Specific API Calls**: Tailored API calls for each provider (Anthropic, OpenAI, Google, DeepSeek, OpenRouter)
3. **Context Caching**: Stores repository information for reuse
4. **Direct Model Testing**: Tests models with appropriate rate limiting and error handling
5. **Same Scoring Logic**: Uses the same evaluation criteria as the original script

## How to Use

To run the direct calibration:

```bash
# Install dependencies if not already done
npm install axios dotenv @supabase/supabase-js

# Run a limited test with a single repository and model
node packages/core/scripts/run-direct-calibration.js --single-repo="pallets/flask" --single-model="anthropic/claude-3-7-sonnet"

# Run full calibration
node packages/core/scripts/run-direct-calibration.js

# Update database with results
node packages/core/scripts/run-direct-calibration.js --update-db
```

## Required Environment Variables

Ensure your `.env` file contains:

```
# Supabase Configuration
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...

# GitHub API Token (for repository information)
GITHUB_TOKEN=...

# Model Provider API Keys
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...
DEEPSEEK_API_KEY=...
OPENROUTER_API_KEY=...
```

## Script Verification and Comparison

Let's verify our prior attempts with DeepWiki:

1. We initially tried to run `check-calibration-readiness.js`, which passed many checks but failed on DeepWiki API connection
2. We attempted to run `run-comprehensive-calibration.js` with single repo/model, which failed with 404 errors for all attempted endpoints
3. We tried to start DeepWiki with Docker, but encountered Docker daemon issues
4. When trying to build DeepWiki directly, we hit build failures related to FAISS library

The new direct approach avoids these issues by bypassing DeepWiki completely. It maintains the same test criteria, evaluation metrics, and scoring algorithms, but with direct model API access.

## Next Steps

1. Run a limited test with the direct calibration script
2. Review results and adjust as needed
3. Run full calibration across all models and repositories
4. Update the database with the calibration results
5. Generate the final model configuration

---

Last Updated: May 13, 2025
