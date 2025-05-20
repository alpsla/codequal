# DeepWiki Integration Commands

This document provides the commands needed to run the DeepWiki API tests and interact with the deployed DeepWiki instance.

## Prerequisites

Ensure you have access to the DeepWiki API by port forwarding:

```bash
# Port forward DeepWiki API
kubectl port-forward -n codequal-dev $(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}') 8001:8001

# Port forward DeepWiki Frontend (optional)
kubectl port-forward -n codequal-dev $(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}') 3000:3000
```

## Manual API Testing

### Chat Completion Tests

```bash
# Test with default provider/model
node packages/core/src/deepwiki/deepwiki-test.js --mode=chat --repo=pallets/click

# Test with OpenAI GPT-4o
node packages/core/src/deepwiki/deepwiki-test.js --mode=chat --repo=pallets/click --provider=openai --model=gpt-4o

# Test with Google Gemini
node packages/core/src/deepwiki/deepwiki-test.js --mode=chat --repo=pallets/click --provider=google --model=gemini-2.5-pro-preview-05-06

# Test with Claude via OpenRouter
node packages/core/src/deepwiki/deepwiki-test.js --mode=chat --repo=pallets/click --provider=openrouter --model=anthropic/claude-3.7-sonnet

# Test with a different repository (medium size)
node packages/core/src/deepwiki/deepwiki-test.js --mode=chat --repo=expressjs/express --provider=openai --model=gpt-4o

# Test with a targeted query
node packages/core/src/deepwiki/deepwiki-test.js --mode=chat --repo=pallets/click --query="What design patterns are used in this repository?" --provider=openai --model=gpt-4o
```

### Wiki Generation Tests

```bash
# Test with default provider/model
node packages/core/src/deepwiki/deepwiki-test.js --mode=wiki --repo=pallets/click

# Test with OpenAI GPT-4o
node packages/core/src/deepwiki/deepwiki-test.js --mode=wiki --repo=pallets/click --provider=openai --model=gpt-4o

# Test with Google Gemini
node packages/core/src/deepwiki/deepwiki-test.js --mode=wiki --repo=pallets/click --provider=google --model=gemini-2.5-pro-preview-05-06

# Test with Claude via OpenRouter
node packages/core/src/deepwiki/deepwiki-test.js --mode=wiki --repo=pallets/click --provider=openrouter --model=anthropic/claude-3.7-sonnet
```

### Direct API Interaction with curl

```bash
# Chat completions
curl -X POST "http://localhost:8001/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/pallets/click",
    "messages": [
      {
        "role": "user",
        "content": "What is the overall architecture of this repository?"
      }
    ],
    "provider": "openai",
    "model": "gpt-4o"
  }'

# Wiki generation
curl -X POST "http://localhost:8001/export/wiki" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "pallets",
    "repo": "click",
    "repo_type": "github",
    "format": "json",
    "language": "en",
    "provider": "google",
    "model": "gemini-2.5-pro-preview-05-06"
  }'
```

## Examining DeepWiki Configuration

To examine DeepWiki's configuration and available models:

```bash
# View generator configuration
kubectl exec -n codequal-dev $(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}') -- cat /app/api/config/generator.json

# View environment variables
kubectl exec -n codequal-dev $(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}') -- printenv | grep API_KEY
```

## Automated Testing Suite

To run our comprehensive automated testing suite:

```bash
# Run the full DeepWiki testing script
cd /Users/alpinro/Code\ Prjects/codequal/docs/deepwiki-testing
bash deepwiki-test-script.sh

# Run a single specific test
cd /Users/alpinro/Code\ Prjects/codequal/docs/deepwiki-testing
bash deepwiki-test-script.sh -t T01-DEFAULT
```

## DeepWiki Client Unit Tests

To run the DeepWikiClient unit tests:

```bash
# Run DeepWikiClient tests
cd /Users/alpinro/Code\ Prjects/codequal
npm run test -- --filter=DeepWikiClient
```

## Performance Metrics Collection

After running tests, collect performance metrics with:

```bash
# Collect metrics from test results
node packages/core/src/deepwiki/collect-metrics.js

# Generate performance report
node packages/core/src/deepwiki/generate-report.js
```

## Database Schema Management

To apply database schema changes to Supabase:

```bash
# Apply schema using Terraform
cd /Users/alpinro/Code\ Prjects/codequal/packages/database/terraform
terraform init
terraform apply -var="supabase_project_ref=YOUR_PROJECT_REF" -var="supabase_access_token=YOUR_ACCESS_TOKEN"
```

## Repository Caching Commands

To test repository cache functionality:

```bash
# Check cache status
curl -X GET "http://localhost:3001/api/repository-cache/status?owner=pallets&repo=click&branch=main"

# Invalidate cache
curl -X POST "http://localhost:3001/api/repository-cache/invalidate" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "pallets",
    "repo": "click",
    "branch": "main",
    "reason": "Manual invalidation for testing"
  }'
```

## DeepWiki API Status Check

To check if the DeepWiki API is functioning correctly:

```bash
# Check API health
curl -X GET "http://localhost:8001/health"

# Check version information
curl -X GET "http://localhost:8001/version"
```

## Setting Up DeepWiki in Different Environments

Instructions for setting up DeepWiki in different environments:

### Development Environment

```bash
# Clone DeepWiki repository
git clone https://github.com/asyncfuncai/deepwiki-open.git
cd deepwiki-open

# Build Docker image
docker build -t deepwiki:dev .

# Run with Docker
docker run -p 3000:3000 -p 8001:8001 \
  -e GITHUB_TOKEN=your_github_token \
  -e OPENAI_API_KEY=your_openai_key \
  -e GOOGLE_API_KEY=your_google_key \
  deepwiki:dev
```

### Production Kubernetes Deployment

```bash
# Create Kubernetes secret
kubectl create secret generic deepwiki-env \
  --namespace codequal-prod \
  --from-literal=GITHUB_TOKEN=your_github_token \
  --from-literal=OPENAI_API_KEY=your_openai_key \
  --from-literal=GOOGLE_API_KEY=your_google_key

# Apply Kubernetes manifests
kubectl apply -f kubernetes/deepwiki-deployment.yaml -n codequal-prod
kubectl apply -f kubernetes/deepwiki-service.yaml -n codequal-prod
kubectl apply -f kubernetes/deepwiki-pvc.yaml -n codequal-prod
```
