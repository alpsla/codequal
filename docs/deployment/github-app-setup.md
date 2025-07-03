# GitHub App Setup Guide for CodeQual

## Quick Setup Steps

### 1. Create a New GitHub App

1. Go to: https://github.com/settings/apps
2. Click **"New GitHub App"**
3. Fill in the following:

#### Basic Information
- **GitHub App name**: `CodeQual-Production` (or similar)
- **Homepage URL**: `https://codequal.dev` (or your domain)
- **Description**: "AI-powered code quality analysis for pull requests"

#### Webhook
- **Webhook URL**: `https://api.codequal.dev/api/webhooks/github` (update with your domain later)
- **Webhook secret**: Generate one with: `openssl rand -hex 32`
  
  ```bash
  # Run this to generate a webhook secret:
  openssl rand -hex 32
  ```
  
  Save this secret! You'll need it for the deployment.

#### Repository Permissions
Set these to **Read & Write**:
- **Actions**: Read
- **Checks**: Write
- **Contents**: Read
- **Issues**: Write
- **Metadata**: Read (mandatory)
- **Pull requests**: Write
- **Commit statuses**: Write

#### Subscribe to Events
Check these boxes:
- [x] Check run
- [x] Check suite
- [x] Issue comment
- [x] Pull request
- [x] Pull request review
- [x] Pull request review comment
- [x] Push

#### Where can this GitHub App be installed?
- Choose: **Any account** (for public use) or **Only on this account** (for private use)

### 2. Create and Install the App

1. Click **"Create GitHub App"**
2. You'll be redirected to your app's settings page

### 3. Generate Private Key

1. Scroll down to **"Private keys"**
2. Click **"Generate a private key"**
3. A `.pem` file will download - **SAVE THIS FILE!**

### 4. Get Your App Credentials

From your app's settings page (https://github.com/settings/apps/YOUR_APP_NAME):

1. **App ID**: Listed at the top of the page
2. **Webhook secret**: The one you generated earlier
3. **Private key**: The `.pem` file you downloaded

### 5. Install the App

1. From your app's page, click **"Install App"**
2. Choose the account/organization
3. Select repositories (can start with one test repo)

## Add Credentials to Kubernetes Secrets

Now update `/kubernetes/production/secrets.yaml`:

```yaml
# GitHub App
GITHUB_APP_ID: "123456"  # Your actual App ID
GITHUB_PRIVATE_KEY: |
  -----BEGIN RSA PRIVATE KEY-----
  MIIEpAIBAAKCAQEA... (paste your entire .pem file contents here)
  -----END RSA PRIVATE KEY-----
GITHUB_WEBHOOK_SECRET: "your-webhook-secret-from-step-1"
```

## Quick Command Reference

```bash
# Generate webhook secret
openssl rand -hex 32

# View your private key file (if needed)
cat ~/Downloads/*.private-key.pem

# Test the configuration
curl -H "Authorization: Bearer YOUR_JWT" \
  https://api.github.com/app
```

## Important Notes

- Keep your private key secure - never commit it to Git
- The webhook URL can be updated later after deployment
- Start with minimal repo permissions and expand as needed
- The app needs to be installed on repos you want to analyze

## Troubleshooting

If you see authentication errors:
1. Verify the App ID is correct
2. Ensure the private key is properly formatted (including headers)
3. Check that the app is installed on the target repository