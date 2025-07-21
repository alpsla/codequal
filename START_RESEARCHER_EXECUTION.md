# Start Researcher Execution - Step by Step

## Quick Start (Copy & Paste)

Open your terminal and run these commands:

```bash
cd "/Users/alpinro/Code Prjects/codequal"

# Set your OpenRouter API key (replace with your actual key)
export OPENROUTER_API_KEY='your-openrouter-api-key-here'

# Run the researcher
npx tsx packages/agents/src/researcher/scheduled-research-runner.ts
```

## Alternative: Use the Script

```bash
cd "/Users/alpinro/Code Prjects/codequal"
OPENROUTER_API_KEY='your-key' ./RUN_RESEARCHER_NOW.sh
```

## What Will Happen

1. **Immediate Start**: The researcher will begin execution as SYSTEM USER
2. **Model Discovery**: Fetches all 319+ models from OpenRouter
3. **Dynamic Evaluation**: Evaluates each model without hardcoded scores
4. **Configuration Updates**: Updates all 800 configurations (10 roles × 10 languages × 4 sizes × 2 models)
5. **Progress Logs**: You'll see real-time progress in the terminal

## Expected Output

```
[INFO] [ScheduledResearchRunner] === SCHEDULED QUARTERLY RESEARCH STARTING ===
[INFO] [ScheduledResearchRunner] Running as: SYSTEM USER (no authentication required)
[INFO] [ProductionResearcherService] Starting comprehensive model research
[INFO] [ProductionResearcherService] Fetched 319 models from OpenRouter
[INFO] [ProductionResearcherService] Evaluated 319 models with dynamic scoring
[INFO] [ProductionResearcherService] AI selected configuration for deepwiki
  Primary: google/gemini-2.5-flash
  Fallback: google/gemini-2.5-pro
...
[INFO] [ScheduledResearchRunner] ✅ Scheduled research completed successfully
  Next scheduled run: 2025-10-01T05:00:00.000Z
```

## Estimated Time

- **Total Duration**: 10-20 minutes (depending on API response times)
- **Models to evaluate**: 319+
- **Configurations to update**: 800

## After Completion

1. All agent configurations will be updated with latest models
2. The old `nousresearch/nous-hermes-2-mixtral-8x7b-dpo` will be replaced
3. Next automatic run: October 1, 2025 at 0:00 AM ET
4. Check logs to see which models were selected

## Troubleshooting

If you see errors:
- **"OPENROUTER_API_KEY not set"**: Set your API key with `export OPENROUTER_API_KEY='your-key'`
- **Module not found**: Run `npm install` first
- **Permission denied**: Run `chmod +x RUN_RESEARCHER_NOW.sh`

## Ready to Start?

Just copy the commands from "Quick Start" above and paste them in your terminal!