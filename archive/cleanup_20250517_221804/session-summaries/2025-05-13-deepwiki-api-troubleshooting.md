# May 13, 2025 - DeepWiki API Troubleshooting

## DeepWiki API Endpoint Issues

When running the calibration process, we encountered errors when trying to connect to the DeepWiki API:

```
Testing pallets/flask-minimal with openai/gpt-4o (python, small)
Error testing pallets/flask-minimal with openai/gpt-4o: 404: {"detail":"Not Found"}
```

This indicates that the endpoint we were using (`/chat/completions`) is not correct for our DeepWiki installation.

## Solutions Implemented

### 1. Enhanced Endpoint Handling

Modified the `testModel` function in `run-comprehensive-calibration.js` to:

- Try multiple possible endpoints based on common DeepWiki configurations
- Add detailed logging for debugging purposes
- Implement fallback logic to automatically try alternative endpoints
- Save the working endpoint for future requests
- Support dynamic discovery of the correct API path

The script now tries the following endpoints in sequence:
- `/chat/completions` (original)
- `/api/chat/completions`
- `/api/v1/chat/completions`
- `/completions`

### 2. Added Limited Testing Mode

Added command-line options to test with a single repository and/or model:

```bash
node packages/core/scripts/run-comprehensive-calibration.js --single-repo="pallets/flask" --single-model="anthropic/claude-3-7-sonnet"
```

This allows for:
- Faster troubleshooting by testing a single combination
- More focused debugging when issues arise
- Easier verification of API connections
- Testing specific models against specific repositories

### 3. Improved Error Handling

- Enhanced error reporting with more detailed messages
- Added logging of specific endpoint failures
- Improved response validation and error classification
- Implemented retry logic with different endpoints

## Next Steps

1. **Run Limited Test**:
   ```bash
   node packages/core/scripts/run-comprehensive-calibration.js --single-repo="pallets/flask" --single-model="anthropic/claude-3-7-sonnet"
   ```

2. **Check DeepWiki Configuration**:
   - Verify DeepWiki container is running
   - Confirm API endpoints in DeepWiki documentation
   - Check Docker logs for any API errors
   - Ensure correct API keys are configured in DeepWiki

3. **Once Working**:
   - Document the successful endpoint for future reference 
   - Update scripts to use the confirmed endpoint by default
   - Proceed with full calibration using all models

## DeepWiki API Troubleshooting

If problems persist, try these additional steps:

1. **Test DeepWiki Chat API Directly**:
   ```bash
   curl -X POST "http://localhost:8001/api/chat/completions" \
     -H "Content-Type: application/json" \
     -d '{
       "repo_url": "https://github.com/pallets/flask",
       "messages": [
         {"role": "system", "content": "You are a repository analyzer."},
         {"role": "user", "content": "Analyze this repository structure."}
       ],
       "provider": "anthropic",
       "model": "claude-3-7-sonnet"
     }'
   ```

2. **Check DeepWiki API Documentation**:
   Look for the current API reference in the DeepWiki documentation at:
   `/Users/alpinro/Code Prjects/deepwiki-open/README.md`

3. **Check DeepWiki Version**:
   There may be differences in API endpoints between versions.

---

Last Updated: May 13, 2025
