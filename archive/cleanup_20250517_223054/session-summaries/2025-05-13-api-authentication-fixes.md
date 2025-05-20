# May 13, 2025 - Fixing API Authentication Issues

## Authentication Issues Encountered

When running the direct calibration script, we encountered two primary authentication issues:

1. **GitHub API Authentication Error**: 
   - Error: "Request failed with status code 401"
   - Cause: Incorrect token format or expired token

2. **Anthropic API Authentication Error**:
   - Error: "invalid x-api-key"
   - Cause: Possible whitespace in the API key or incorrect format

## Fixes Implemented

### 1. GitHub API Access Improvements

- **Added Fallback to Public Access**: 
  - First attempts authenticated requests with Bearer token
  - Gracefully falls back to unauthenticated requests if authentication fails
  - Ensures repository data can still be retrieved even without valid GitHub tokens

- **Improved Token Handling**:
  - Added `.trim()` to remove any whitespace from tokens
  - Updated from `token` prefix to standard `Bearer` prefix
  - Enhanced error detection and reporting

### 2. Anthropic API Authentication Fix

- **Fixed API Key Handling**:
  - Added `.trim()` to remove any whitespace from API key
  - Reordered headers to ensure proper authentication
  - Validated Anthropic API key format and usage

### 3. Added API Key Validation

- **Pre-flight Validation**:
  - Added `validateApiKey()` function to test API keys before starting calibration
  - Performs minimal API calls to verify authentication
  - Provides clear error messages for invalid keys
  - Prevents wasted time when keys are invalid

- **Provider-Specific Validation**:
  - Implements proper validation for each provider's API:
    - Anthropic
    - OpenAI
    - Gemini
    - DeepSeek
    - OpenRouter

## How to Run the Fixed Script

1. **Verify API Keys**:
   Make sure all API keys in the `.env` file are properly formatted without leading or trailing whitespace.

2. **Run with Single Model First**:
   ```bash
   node packages/core/scripts/run-direct-calibration.js --single-repo="pallets/flask" --single-model="anthropic/claude-3-7-sonnet"
   ```

3. **Watch for Validation Results**:
   The script will now validate the API key before proceeding with calibration and provide clear feedback.

## Troubleshooting Invalid API Keys

If you encounter API key validation failures:

1. **Check for Whitespace**:
   Make sure there are no extra spaces at the beginning or end of the API key.

2. **Verify Key Format**:
   - Anthropic: Should start with "sk-ant-api..."
   - OpenAI: Should start with "sk-..."
   - Gemini: Usually a string of alphanumeric characters
   - DeepSeek: Usually starts with "sk-..."

3. **Check Key Status**:
   Verify in the provider's dashboard that the key is active and not expired.

4. **Create New Keys if Needed**:
   If issues persist, generate new API keys from the provider's dashboard.

The updated script now handles these issues gracefully and provides better feedback for API authentication problems.

---

Last Updated: May 13, 2025