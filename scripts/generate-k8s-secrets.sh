#!/bin/bash

# Generate Kubernetes secrets from environment variables
# This script should be run locally and the output should NOT be committed to git

set -euo pipefail

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found"
    exit 1
fi

# Source the .env file
set -a
source .env
set +a

# Generate random secrets if not provided
API_SECRET_KEY=${API_SECRET_KEY:-$(openssl rand -hex 32)}
JWT_SECRET=${JWT_SECRET:-$(openssl rand -hex 32)}
API_KEY_ENCRYPTION_SECRET=${API_KEY_ENCRYPTION_SECRET:-$(openssl rand -hex 16)}

# Create the secrets file
cat > kubernetes/production/secrets.yaml << EOF
# WARNING: This file contains sensitive information. DO NOT commit to version control!
# Generated on: $(date)
apiVersion: v1
kind: Secret
metadata:
  name: codequal-secrets
  namespace: codequal-prod
type: Opaque
stringData:
  # Database
  DATABASE_URL: "postgresql://${SUPABASE_DB_USER}:${SUPABASE_DB_PASSWORD}@${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}?sslmode=require"
  
  # Supabase
  SUPABASE_URL: "${SUPABASE_URL}"
  SUPABASE_SERVICE_KEY: "${SUPABASE_SERVICE_KEY}"
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}"
  SUPABASE_JWT_SECRET: "${SUPABASE_JWT_SECRET}"
  
  # OpenAI
  OPENAI_API_KEY: "${OPENAI_API_KEY}"
  
  # OpenRouter (for model selection)
  OPENROUTER_API_KEY: "${OPENROUTER_API_KEY}"
  
  # GitHub App (if using GitHub App authentication)
  GITHUB_APP_ID: "${GITHUB_APP_ID:-}"
  GITHUB_PRIVATE_KEY: |
${GITHUB_PRIVATE_KEY:-"    # Add your GitHub App private key here"}
  GITHUB_WEBHOOK_SECRET: "${GITHUB_WEBHOOK_SECRET:-$(openssl rand -hex 32)}"
  
  # Application Security
  NODE_ENV: "production"
  API_SECRET_KEY: "${API_SECRET_KEY}"
  JWT_SECRET: "${JWT_SECRET}"
  
  # API Keys Encryption
  API_KEY_ENCRYPTION_SECRET: "${API_KEY_ENCRYPTION_SECRET}"
  
  # Optional services
  GRAFANA_API_KEY: "${GRAFANA_API_KEY:-}"
  RESEND_API_KEY: "${RESEND_API_KEY:-}"
  STRIPE_SECRET_KEY: "${STRIPE_SECRET_KEY:-}"
  STRIPE_WEBHOOK_SECRET: "${STRIPE_WEBHOOK_SECRET:-}"
  
  # Additional AI providers
  ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY:-}"
  DEEPSEEK_API_KEY: "${DEEPSEEK_API_KEY:-}"
  TOGETHER_API_KEY: "${TOGETHER_API_KEY:-}"
  VOYAGE_API_KEY: "${VOYAGE_API_KEY:-}"
EOF

echo "✅ Secrets file generated at kubernetes/production/secrets.yaml"
echo "⚠️  IMPORTANT: This file contains sensitive data. Do NOT commit it to git!"
echo ""
echo "📝 This script only creates a LOCAL file. To deploy to Kubernetes:"
echo ""
echo "  1. Apply to your cluster:"
echo "     kubectl apply -f kubernetes/production/secrets.yaml"
echo ""
echo "  2. DELETE the local file immediately after applying:"
echo "     rm kubernetes/production/secrets.yaml"
echo ""
echo "  3. Verify deployment:"
echo "     kubectl get secrets -n codequal-prod"
echo ""
echo "🔒 For production, consider using:"
echo "  - GitHub Actions with GitHub Secrets"
echo "  - Sealed Secrets for GitOps"
echo "  - External secret management (Vault, AWS Secrets Manager)"
echo ""
echo "📖 See docs/deployment/kubernetes-secrets-management.md for details"