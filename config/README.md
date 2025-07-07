# CodeQual Configuration System

## Overview

This directory contains the centralized configuration for the entire CodeQual application. All packages should reference this central config rather than maintaining their own.

## Structure

```
/config
  ├── README.md              # This file
  ├── default.json           # Base configuration for all environments
  ├── development.json       # Development environment overrides
  ├── production.json        # Production environment overrides  
  ├── test.json             # Test environment overrides
  ├── pricing.json          # Pricing tiers and limits
  ├── features.json         # Feature flags
  └── schema.ts             # TypeScript interfaces and validation
```

## Usage

### In Node.js/API:
```typescript
import config from '@codequal/config';

const port = config.get('api.port');
const stripePricing = config.get('pricing.tiers.professional');
```

### In Next.js/React:
```typescript
// Only NEXT_PUBLIC_ prefixed values are available client-side
import { publicConfig } from '@codequal/config/client';

const apiUrl = publicConfig.api.baseUrl;
```

## Environment Variables

Sensitive values should never be stored in JSON files. Use environment variables:

- `STRIPE_SECRET_KEY` - Stripe secret key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key
- `DATABASE_URL` - Database connection string
- `GITHUB_CLIENT_SECRET` - OAuth secrets

## Pricing Configuration

Edit `pricing.json` to change pricing without touching code:

```json
{
  "tiers": {
    "free": {
      "name": "Free",
      "price": 0,
      "currency": "USD",
      "features": [
        "5 repository scans/month",
        "Basic security analysis",
        "Community support"
      ],
      "limits": {
        "apiCalls": 100,
        "repositories": 5,
        "teamMembers": 1
      }
    }
  }
}
```

## Feature Flags

Control feature rollout via `features.json`:

```json
{
  "auth": {
    "useWorkaround": true,
    "enableGitHub": true,
    "enableGoogle": false
  },
  "billing": {
    "enabled": false,
    "sandbox": true
  }
}
```

## Adding New Configuration

1. Add the schema to `schema.ts`
2. Add default values to `default.json`
3. Add environment-specific overrides as needed
4. Document the new config here
5. Use TypeScript for type safety