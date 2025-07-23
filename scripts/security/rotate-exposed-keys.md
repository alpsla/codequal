# Urgent: Rotate Exposed API Keys

## Critical Security Issue
The following API keys have been exposed in the git repository and must be rotated immediately:

### 1. OpenRouter API Key
- **Exposed Key (partial)**: `sk-or-v1-deaaf1e91c28eb42d1760a4c...`
- **Exposed Key (partial)**: `sk-or-v1-12f747f9d13f4799e4d26ba1...`
- **Action Required**: 
  1. Log into OpenRouter dashboard
  2. Revoke the exposed keys
  3. Generate new API keys
  4. Update environment variables

### 2. Check for Other Exposed Secrets
Run the following commands to check for any other exposed secrets:

```bash
# Search for potential API keys in the codebase
grep -r "sk-" --include="*.js" --include="*.ts" --include="*.yaml" .
grep -r "api_key" --include="*.js" --include="*.ts" --include="*.yaml" .
grep -r "secret" --include="*.js" --include="*.ts" --include="*.yaml" .

# Check git history for exposed secrets
git log --all --grep="key\|secret\|password" -p | grep -E "(sk-|api_key|secret)"
```

### 3. Prevention Measures Implemented
- Removed all hardcoded API keys from source files
- Updated scripts to require environment variables
- Added patterns to .gitignore for API key files
- Created template files for configuration

### 4. Next Steps
1. **Immediately**: Rotate all exposed API keys
2. **Today**: Audit all environment variables and secrets
3. **This Week**: Implement secret scanning in CI/CD pipeline
4. **Long Term**: Use a proper secret management system (e.g., HashiCorp Vault, AWS Secrets Manager)

### 5. Affected Files (Now Fixed)
- `run-researcher-direct.js`
- `run-enhanced-researcher.js`
- `run-researcher-test.js`
- `packages/core/scripts/calibration/test-openrouter-direct.js`
- `packages/core/scripts/calibration/test-openrouter-direct-full.js`
- `packages/core/scripts/calibration/openrouter_config.yaml` (removed)
- `packages/core/scripts/calibration/openrouter_config_fix.yaml` (removed)
- `packages/core/scripts/deepwiki_integration/deepwiki-api-keys.yaml` (removed)

### 6. Archive Cleanup Required
The following archived directories contain exposed keys and should be cleaned:
- `build-system/archived/historical-archive/*/output_dirs/deepwiki_integration/deepwiki-api-keys.yaml`

Run: `find build-system/archived -name "*api-keys.yaml" -delete`