# May 13, 2025 - API Authentication Issues & Resolution

## Session Overview

In today's session, we focused on troubleshooting and addressing API authentication issues for the model calibration process. After discovering that both GitHub and Anthropic APIs were returning 401 unauthorized errors, we implemented several solutions and workarounds.

## Key Issues Identified

1. **GitHub Authentication Failing**: 
   - The GitHub token was recognized but returning 401 errors
   - Format issues (Bearer vs. token prefix) may be causing problems

2. **Anthropic API Key Invalid**:
   - "invalid x-api-key" error suggests the key may be expired or wrong format
   - API key validation is failing despite key being present

3. **Script Execution Issues**:
   - Direct calibration script had execution issues
   - Missing main execution code detection

## Solutions Implemented

### 1. Diagnostic Tools

- **Created Debug Script** (`debug-api-keys.js`):
  - Tests different GitHub token formats (Bearer, token, raw)
  - Tests Anthropic API authentication with multiple header formats
  - Provides detailed error information
  - Falls back to unauthenticated GitHub access

- **Comprehensive Documentation**:
  - Created API key troubleshooting guide
  - Documented API key acquisition process
  - Added direct curl testing examples

### 2. Alternative Approaches

- **Direct GitHub Access**:
  - Implemented fallback to unauthenticated GitHub access for public repositories
  - Added better error handling for rate limits and other issues
  - Improved repository context construction from limited data

- **Mock Calibration Data**:
  - Created `generate-mock-calibration.js` to provide reasonable defaults
  - Generated mock configurations for all major languages and repository sizes
  - Implemented a fallback approach when API authentication fails

### 3. API Key Management

- **Improved Key Handling**:
  - Added `.trim()` to remove whitespace from all keys
  - Tried multiple authentication header formats
  - Better error reporting for invalid keys

## Files Created/Modified

1. **New Scripts**:
   - `/packages/core/scripts/debug-api-keys.js`: API authentication diagnostics
   - `/packages/core/scripts/generate-mock-calibration.js`: Fallback configuration

2. **New Documentation**:
   - `/docs/maintenance/api-key-guide.md`: Guide for creating new API keys
   - `/docs/session-summaries/2025-05-13-api-authentication-troubleshooting.md`: Troubleshooting guide

3. **Fixed Scripts**:
   - `/packages/core/scripts/run-direct-calibration.js`: Added missing execution code
   - Enhanced error handling in calibration scripts

## Next Steps

### Immediate Actions

1. **Test with Updated Anthropic API Key**:
   - Run the debug script again to verify the new key works
   - Test the direct calibration with the new key
   - If successful, proceed with targeted calibration

2. **GitHub Authentication Options**:
   - Create a new GitHub token with appropriate scopes
   - If GitHub authentication continues to fail, use public repositories
   - Update the script to work with unauthenticated GitHub access

3. **Fallback Process**:
   ```bash
   # If API issues persist, generate mock configuration:
   node packages/core/scripts/generate-mock-calibration.js
   
   # Then apply it to the core package:
   cp packages/core/scripts/calibration-results/repository-model-config.ts packages/core/src/config/models/
   npm run build:core
   ```

### Longer-term Improvements

1. **API Key Rotation System**:
   - Implement a system for scheduled API key rotation
   - Add expiration checking to prevent using expired keys
   - Create a monitoring system for API key usage and failures

2. **Enhanced Error Recovery**:
   - Improve fallback mechanisms when APIs fail
   - Add retry logic with exponential backoff
   - Implement circuit breakers for unreliable APIs

3. **Configuration Validation**:
   - Add validation for configuration files before applying
   - Create benchmarks to verify configuration quality
   - Implement A/B testing for different configurations

## Conclusion

While API authentication posed significant challenges, we've implemented a robust set of tools and fallback mechanisms to ensure the calibration process can proceed even with authentication issues. The mock calibration approach provides reasonable defaults based on known model characteristics, while the improved debugging tools make it easier to identify and resolve authentication problems.

With the updated Anthropic API key, we should now be able to proceed with at least partial calibration, and can implement the full process once all authentication issues are resolved.

---

Last Updated: May 13, 2025