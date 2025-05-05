# Secure Token Management

This document outlines the secure approach to token management in the CodeQual project.

## Principles

1. **Never commit secrets to version control**
2. **Use environment variables for all sensitive tokens**
3. **Provide clear examples without real values**
4. **Use secure storage mechanisms for CI/CD**

## Local Development

For local development, secrets are managed using environment variables in `.env.local` files that are not committed to the repository:

1. Copy `.env.example` to `.env.local`
2. Add your API keys and tokens to `.env.local`
3. The application will load these values at runtime

```bash
cp .env.example .env.local
# Edit .env.local with your actual tokens
```

## CI/CD Environments

For CI/CD environments (GitHub Actions), secrets are managed using:

1. **Repository Secrets**: Sensitive values are stored as GitHub repository secrets
2. **Environment Variables**: Secrets are loaded as environment variables during CI runs
3. **Conditional Execution**: Steps requiring secrets only run when secrets are available

### Setting Up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each token (SNYK_TOKEN, ANTHROPIC_API_KEY, etc.)

### Security Scanning

The dependency scanning job in our CI pipeline:

1. Loads the SNYK_TOKEN from GitHub secrets
2. Only runs the scan if the token is available
3. Uses the severity threshold from environment variables

## Tokens Required

| Token | Purpose | Where to Get |
|-------|---------|-------------|
| SUPABASE_URL | Database access | Supabase project settings |
| SUPABASE_KEY | Database access | Supabase project settings |
| GITHUB_TOKEN | GitHub API access | GitHub user settings > Developer settings > Personal access tokens |
| ANTHROPIC_API_KEY | Claude API access | Anthropic Console |
| DEEPSEEK_API_KEY | DeepSeek API access | DeepSeek developer portal |
| OPENAI_API_KEY | OpenAI API access | OpenAI platform |
| SNYK_TOKEN | Dependency scanning | Snyk account settings |

## Best Practices

1. Use the minimum required permissions for each token
2. Rotate tokens regularly
3. Monitor token usage for unusual patterns
4. Revoke tokens immediately if compromised
5. Use different tokens for development and production