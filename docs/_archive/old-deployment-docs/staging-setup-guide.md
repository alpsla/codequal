# CodeQual Staging Environment Setup Guide

## 🎯 Purpose
Create a production-like environment for testing before actual production deployment.

## 🏗️ Infrastructure Setup

### Option 1: DigitalOcean App Platform (Recommended for Simplicity)
```yaml
Staging Environment:
  - App: staging-codequal-api
  - Database: Supabase (staging project)
  - URL: https://staging-api.codequal.com
  - Cost: ~$20/month

Steps:
  1. Create new app in DigitalOcean
  2. Connect to 'staging' branch
  3. Set environment variables
  4. Configure auto-deploy on push
```

### Option 2: Docker + VPS (More Control)
```yaml
Staging Server:
  - Provider: DigitalOcean Droplet
  - Size: 2GB RAM, 1 vCPU ($12/month)
  - OS: Ubuntu 22.04
  - Docker: Latest
  - Nginx: Reverse proxy
```

## 📋 Staging Setup Checklist

### 1. Database Setup
```bash
# Create Supabase staging project
# Name: codequal-staging
# Region: Same as production

# Get these values:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

### 2. Environment Configuration
```env
# .env.staging
NODE_ENV=staging
PORT=3000
API_URL=https://staging-api.codequal.com

# Supabase Staging
SUPABASE_URL=your-staging-url
SUPABASE_ANON_KEY=your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-key

# Monitoring (same as prod)
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=staging

# Features
ENABLE_ANALYTICS=true
ENABLE_ERROR_TRACKING=true
RATE_LIMIT_ENABLED=true
```

### 3. Deployment Script
```bash
#!/bin/bash
# deploy-staging.sh

echo "🚀 Deploying to Staging..."

# Build Docker image
docker build -t codequal-api:staging .

# Tag for registry
docker tag codequal-api:staging registry.digitalocean.com/codequal/api:staging

# Push to registry
docker push registry.digitalocean.com/codequal/api:staging

# Deploy to staging
doctl apps create-deployment $STAGING_APP_ID

echo "✅ Staging deployment complete"
```

### 4. GitHub Actions for Staging
```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
      
      - name: Build and push Docker image
        run: |
          docker build -t registry.digitalocean.com/codequal/api:staging .
          doctl registry login
          docker push registry.digitalocean.com/codequal/api:staging
      
      - name: Deploy to staging
        run: |
          doctl apps create-deployment ${{ secrets.STAGING_APP_ID }}
```

## 🧪 Staging-Specific Features

### 1. Test Data Seeding
```javascript
// scripts/seed-staging.js
if (process.env.NODE_ENV === 'staging') {
  await seedTestUsers();
  await seedTestApiKeys();
  await seedSampleReports();
  console.log('✅ Staging data seeded');
}
```

### 2. Feature Flags
```javascript
// config/features.js
const FEATURES = {
  ENHANCED_UI: process.env.NODE_ENV === 'staging' || process.env.ENABLE_ENHANCED_UI,
  NEW_SKILLS_LOGIC: process.env.NODE_ENV === 'staging',
  PAYMENT_SANDBOX: process.env.NODE_ENV !== 'production'
};
```

### 3. Monitoring & Alerts
```yaml
Staging Monitoring:
  - Uptime checks: Every 5 minutes
  - Error threshold: 5% (vs 1% in prod)
  - Performance alerts: 1s response time
  - Disk space alerts: 80% threshold
```

## 🔄 Staging Workflow

### Daily Deployment
```bash
# 1. Merge development → staging
git checkout staging
git merge development

# 2. Auto-deploy triggers

# 3. Run smoke tests
npm run test:staging:smoke

# 4. Manual verification
```

### Testing Process
```yaml
Week 1:
  - Deploy to staging
  - Run all automated tests
  - Manual testing checklist
  - Performance testing

Week 2:
  - Fix identified issues
  - Re-test
  - Load testing
  - Security scan
```

## 📊 Staging vs Production

| Feature | Staging | Production |
|---------|---------|------------|
| Auto-deploy | Yes (staging branch) | No (manual) |
| Test data | Yes | No |
| Rate limits | Relaxed | Strict |
| Error details | Full | Limited |
| Feature flags | All enabled | Selective |
| Monitoring | Basic | Comprehensive |
| Backups | Daily | Hourly |
| SSL | Let's Encrypt | Let's Encrypt |

## 🚀 Quick Start

```bash
# 1. Clone and checkout staging branch
git checkout -b staging

# 2. Create staging environment file
cp .env.example .env.staging

# 3. Update with staging values
# Edit .env.staging

# 4. Deploy to staging
npm run deploy:staging

# 5. Run staging tests
npm run test:staging
```

## ⚠️ Important Notes

1. **Data Isolation**: Staging uses completely separate database
2. **Cost Management**: Use smaller instances for staging
3. **Access Control**: Staging should be password protected
4. **Cleanup**: Regular cleanup of test data
5. **Sync**: Keep staging branch close to production

## 🔐 Security

### Basic Auth for Staging
```nginx
# nginx.conf
location / {
    auth_basic "Staging Environment";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://localhost:3000;
}
```

### Create Password
```bash
sudo htpasswd -c /etc/nginx/.htpasswd staginguser
```

This staging environment gives you production-like testing without the risk!