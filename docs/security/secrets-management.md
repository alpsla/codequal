# Secrets Management

## Overview

This document outlines the secure management of secrets and API keys in the CodeQual project.

## Security Issue Fixed

Previously, the project had hardcoded API keys and secrets in the following files:
- `kubernetes/production/secrets.yaml` - contained real API keys, database passwords, and private keys
- `.env` file was not properly gitignored

This was a **CRITICAL security vulnerability** (CVSS 9.1/10, CWE-798) that could lead to:
- Unauthorized access to databases
- API key theft and abuse
- Complete system compromise

## Solution Implemented

### 1. Removed Hardcoded Secrets
- Deleted the exposed `kubernetes/production/secrets.yaml` file
- Added proper .gitignore rules to prevent accidental commits

### 2. Created Secure Templates
- `kubernetes/production/secrets-template.yaml` - Template showing structure without real values
- `.env.example` - Example environment file without real secrets

### 3. Automated Secret Generation
- Created `scripts/generate-k8s-secrets.sh` to generate Kubernetes secrets from environment variables
- Script reads from local `.env` file (which is gitignored)
- Generates proper `secrets.yaml` for Kubernetes deployment

### 4. Updated .gitignore
Added comprehensive rules to ignore:
- All secrets.yaml files (except templates)
- All .env files (except examples)
- API keys and certificates

## Usage

### For Local Development
1. Copy `.env.example` to `.env`
2. Fill in your actual secret values
3. Never commit the `.env` file

### For Kubernetes Deployment
1. Ensure your `.env` file has all required values
2. Run the script to generate secrets:
   ```bash
   ./scripts/generate-k8s-secrets.sh
   ```
3. Apply to your cluster:
   ```bash
   kubectl apply -f kubernetes/production/secrets.yaml
   ```
4. Verify the secrets file is ignored:
   ```bash
   git status --ignored kubernetes/production/secrets.yaml
   ```

### Best Practices

1. **Never commit secrets** - Always use environment variables or secret management systems
2. **Rotate keys regularly** - If a key is exposed, rotate it immediately
3. **Use different keys for different environments** - Don't use production keys in development
4. **Audit access** - Regularly review who has access to secrets
5. **Use secret scanning** - Enable GitHub secret scanning or similar tools

### Emergency Response

If secrets are accidentally exposed:
1. **Immediately rotate all affected keys**
2. Review access logs for any unauthorized usage
3. Update all systems using the compromised keys
4. Conduct a security audit

## Verification

Run these commands to verify security is properly configured:

```bash
# Check that secrets files are ignored
git status --ignored | grep secrets.yaml

# Verify .env is ignored
git check-ignore .env

# Check for any exposed secrets in git history
git log --all --full-history -- '*secrets*.yaml' '*.env'
```

## References
- [OWASP: Use of Hard-coded Credentials](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)