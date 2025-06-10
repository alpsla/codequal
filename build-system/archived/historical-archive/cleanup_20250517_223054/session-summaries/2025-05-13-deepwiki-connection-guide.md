# May 13, 2025 - DeepWiki API Connection Guide for Calibration

## DeepWiki API Connection Issues

When running the calibration process, we consistently encountered 404 errors when trying to connect to the DeepWiki API. After investigating the DeepWiki documentation, we found several important details:

1. The correct endpoint is `/chat/completions/stream`, not `/chat/completions`
2. The API might need to be started manually

## How to Start DeepWiki

According to the documentation, there are two ways to start DeepWiki:

### Option 1: Using Docker (Recommended)

```bash
# Make sure you're in the DeepWiki directory
cd /Users/alpinro/Code\ Prjects/deepwiki-open

# Check if the container is already running
docker ps | grep deepwiki

# If not running, start it with Docker Compose
docker-compose up -d
```

### Option 2: Manual Start (Alternative)

```bash
# Make sure you're in the DeepWiki directory
cd /Users/alpinro/Code\ Prjects/deepwiki-open

# Start the API server (Backend)
python -m api.main

# In a separate terminal, start the frontend
npm run dev
```

## Testing the DeepWiki API

Once DeepWiki is running, you can test it with curl:

```bash
curl -X POST "http://localhost:8001/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/pallets/flask",
    "messages": [
      {"role": "system", "content": "You are a repository analyzer."},
      {"role": "user", "content": "Describe the overall architecture of this repository."}
    ],
    "provider": "anthropic",
    "model": "claude-3-7-sonnet"
  }'
```

## Updated Calibration Script

We've updated the calibration script to try multiple endpoints in the following order:

1. `/chat/completions/stream` (Main endpoint according to docs)
2. `/chat/completions` (Original endpoint we tried)
3. `/api/chat/completions/stream`
4. `/api/chat/completions`
5. `/api/v1/chat/completions`
6. `/completions`

The script will try each endpoint in sequence until one works, making it more resilient to different DeepWiki configurations.

## Running a Calibration Test

After ensuring DeepWiki is running, try a limited calibration test:

```bash
node packages/core/scripts/run-comprehensive-calibration.js --single-repo="pallets/flask" --single-model="anthropic/claude-3-7-sonnet"
```

## Troubleshooting DeepWiki API

If you're still having issues:

1. **Check Docker Status**:
   ```bash
   docker ps
   ```
   Look for a container running DeepWiki.

2. **Check DeepWiki Logs**:
   ```bash
   docker logs $(docker ps -q --filter "name=deepwiki")
   ```

3. **Verify API Access From Browser**:
   Visit http://localhost:8001 in your browser - you should see a simple message if the API is running.

4. **Check Frontend Access**:
   Visit http://localhost:3000 in your browser - you should see the DeepWiki UI.

5. **Review Environment Variables**:
   Make sure the `.env` file in the DeepWiki directory has the correct API keys:
   ```
   GOOGLE_API_KEY=...
   OPENAI_API_KEY=...
   ```

## Alternative Approach if DeepWiki Cannot Be Fixed

If the DeepWiki API cannot be made to work, we have several options:

1. **Direct Model API Calls**:
   - Instead of using DeepWiki as an intermediary, call the model APIs directly
   - Update the calibration scripts to use the Anthropic, OpenAI, etc. APIs directly

2. **Local Repository Analysis**:
   - Implement a lightweight version of DeepWiki's functionality
   - Clone repositories locally and perform basic analysis before sending to models

3. **Static Test Set**:
   - Use pre-prepared test data instead of dynamic repository analysis
   - Create a fixed set of calibration prompts that don't require DeepWiki

---

Last Updated: May 13, 2025
