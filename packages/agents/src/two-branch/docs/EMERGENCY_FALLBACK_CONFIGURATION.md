# Emergency Fallback Configuration Guide

## Overview

The V9 system uses a 3-tier resilience strategy for AI API calls:

1. **Tier 1**: OpenRouter multi-key rotation (3+ keys with automatic failover)
2. **Tier 2**: Emergency direct provider fallback (Gemini, Claude, GPT)
3. **Tier 3**: Graceful degradation (static analysis fallback)

This guide covers **Tier 2** configuration via `.env` file.

---

## Configuration Options

### Provider Selection

Set which emergency provider to use when all OpenRouter keys fail:

```bash
# Provider options: gemini, anthropic, openai, none
EMERGENCY_FALLBACK_PROVIDER=gemini
```

### Model Configuration (Multiple Options)

#### Option 1: Provider-Specific Model (Recommended)

Use provider-specific environment variables for maximum flexibility:

```bash
# Gemini models (when EMERGENCY_FALLBACK_PROVIDER=gemini)
GEMINI_MODEL=gemini-2.5-pro         # Current default
# GEMINI_MODEL=gemini-3.0-flash     # Future upgrade example
# GEMINI_MODEL=gemini-pro           # Alternative

# Claude models (when EMERGENCY_FALLBACK_PROVIDER=anthropic)
CLAUDE_MODEL=claude-sonnet-4-20250514    # Current default
# CLAUDE_MODEL=claude-sonnet-4.5-20250701 # Future upgrade example
# CLAUDE_MODEL=claude-opus-4             # Higher quality

# OpenAI models (when EMERGENCY_FALLBACK_PROVIDER=openai)
GPT_MODEL=gpt-4o                    # Current default
# GPT_MODEL=gpt-4.5-turbo           # Future upgrade example
# GPT_MODEL=gpt-4o-mini             # Cost-effective
```

#### Option 2: Universal Model Override

Set one model for all providers (less flexible):

```bash
EMERGENCY_FALLBACK_MODEL=gemini-2.5-pro
# This will be used regardless of which provider is selected
```

### API Keys (Required)

Each provider requires its own API key:

```bash
# Gemini (Google AI)
GOOGLE_API_KEY=AIzaSy...

# Claude (Anthropic)
ANTHROPIC_API_KEY=sk-ant-...

# GPT (OpenAI)
OPENAI_API_KEY=sk-...
```

---

## Configuration Priority

The system resolves the model to use with this priority:

1. **Provider-specific variable** (`GEMINI_MODEL`, `CLAUDE_MODEL`, `GPT_MODEL`)
2. **Universal override** (`EMERGENCY_FALLBACK_MODEL`)
3. **Built-in default** (hardcoded in code)

### Example Resolution

```bash
# Scenario 1: Provider-specific takes priority
EMERGENCY_FALLBACK_PROVIDER=gemini
GEMINI_MODEL=gemini-3.0-flash
EMERGENCY_FALLBACK_MODEL=gemini-2.5-pro
# Result: Uses gemini-3.0-flash ✅

# Scenario 2: Universal override when no provider-specific
EMERGENCY_FALLBACK_PROVIDER=gemini
EMERGENCY_FALLBACK_MODEL=gemini-2.5-pro
# Result: Uses gemini-2.5-pro ✅

# Scenario 3: Built-in default when nothing configured
EMERGENCY_FALLBACK_PROVIDER=gemini
# Result: Uses gemini-2.5-pro (hardcoded default) ✅
```

---

## Common Configuration Scenarios

### Scenario 1: Current Setup (Gemini 2.5 Pro)

```bash
EMERGENCY_FALLBACK_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-pro
GOOGLE_API_KEY=AIzaSy...
```

### Scenario 2: Future Upgrade to Gemini 3.0

```bash
EMERGENCY_FALLBACK_PROVIDER=gemini
GEMINI_MODEL=gemini-3.0-flash
GOOGLE_API_KEY=AIzaSy...
```

### Scenario 3: Switch to Claude Sonnet 4.5

```bash
EMERGENCY_FALLBACK_PROVIDER=anthropic
CLAUDE_MODEL=claude-sonnet-4.5-20250701
ANTHROPIC_API_KEY=sk-ant-...
```

### Scenario 4: Multi-Provider Fallback Chain

```bash
# Primary fallback: Gemini 2.5 Pro
EMERGENCY_FALLBACK_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-pro
GOOGLE_API_KEY=AIzaSy...

# Secondary fallback: Claude (manually switch if Gemini fails)
CLAUDE_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=sk-ant-...

# Tertiary fallback: GPT
GPT_MODEL=gpt-4o
OPENAI_API_KEY=sk-...
```

---

## Model Name Format

Models can be specified with or without provider prefix:

```bash
# Both formats work (prefix is automatically stripped)
GEMINI_MODEL=gemini-2.5-pro           # ✅ Preferred
GEMINI_MODEL=google/gemini-2.5-pro    # ✅ Also works

CLAUDE_MODEL=claude-sonnet-4-20250514       # ✅ Preferred
CLAUDE_MODEL=anthropic/claude-sonnet-4      # ✅ Also works

GPT_MODEL=gpt-4o                      # ✅ Preferred
GPT_MODEL=openai/gpt-4o               # ✅ Also works
```

---

## Verification

When the application starts, you'll see a log message confirming the configuration:

```
[EmergencyFallbackProvider] ✅ Configured: gemini/gemini-2.5-pro (from provider-specific)
```

Possible sources in log:
- `provider-specific` → Used `GEMINI_MODEL`, `CLAUDE_MODEL`, or `GPT_MODEL`
- `EMERGENCY_FALLBACK_MODEL` → Used universal override
- `default` → Used built-in hardcoded default

---

## Testing Fallback

To test the emergency fallback without disabling OpenRouter:

```typescript
// Temporarily set all OpenRouter keys to invalid
OPENROUTER_API_KEYS=sk-invalid-1,sk-invalid-2,sk-invalid-3

// Run test - should fall back to emergency provider
npx ts-node test-v9-e2e-complete.ts
```

Expected output:
```
[ResilientAIClient] ⚠️  OpenRouter failed for SecurityAgent: ...
[ResilientAIClient] 🚨 Using emergency fallback for SecurityAgent...
[EmergencyFallbackProvider] Executing via gemini/gemini-2.5-pro...
[ResilientAIClient] ✅ Emergency fallback successful for SecurityAgent (gemini/gemini-2.5-pro)
```

---

## Cost Comparison

### Gemini Models (Google AI)
- **gemini-2.5-pro**: $1.25/$5.00 per 1M tokens (input/output)
- **gemini-3.0-flash** (future): ~$0.20/$0.40 per 1M tokens (estimated)
- **gemini-pro**: $0.50/$1.50 per 1M tokens

### Claude Models (Anthropic)
- **claude-sonnet-4**: $3.00/$15.00 per 1M tokens
- **claude-sonnet-4.5** (future): ~$3.50/$17.00 per 1M tokens (estimated)
- **claude-opus-4**: $15.00/$75.00 per 1M tokens

### OpenAI Models
- **gpt-4o**: $2.50/$10.00 per 1M tokens
- **gpt-4.5-turbo** (future): ~$3.00/$12.00 per 1M tokens (estimated)
- **gpt-4o-mini**: $0.15/$0.60 per 1M tokens

**Recommendation**: Gemini 2.5 Pro offers best price/performance for fallback scenarios.

---

## Migration Guide

### Upgrading to Gemini 3.0 (When Available)

1. Update `.env`:
   ```bash
   GEMINI_MODEL=gemini-3.0-flash
   ```

2. Test with small workload:
   ```bash
   # Test with 10 issues instead of full PR
   npx ts-node test-v9-small.ts
   ```

3. Monitor quality and cost:
   - Check V9 report quality scores
   - Compare token usage in logs
   - Validate fix suggestions are still accurate

4. If successful, deploy to production:
   ```bash
   # Update production .env
   ssh oracle "echo 'GEMINI_MODEL=gemini-3.0-flash' >> ~/codequal/.env"
   ```

### Switching Providers (e.g., Gemini → Claude)

1. Add new API key:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. Update provider and model:
   ```bash
   EMERGENCY_FALLBACK_PROVIDER=anthropic
   CLAUDE_MODEL=claude-sonnet-4-20250514
   ```

3. Test and validate before production deployment

---

## Troubleshooting

### Problem: "No API key found" Warning

```
[EmergencyFallbackProvider] Provider "gemini" selected but no API key found. Set GOOGLE_API_KEY
```

**Solution**: Add the required API key to `.env`:
```bash
GOOGLE_API_KEY=AIzaSy...
```

### Problem: Emergency Fallback Not Activating

**Check**:
1. All OpenRouter keys must fail first (Tier 1)
2. Emergency provider must be configured (`EMERGENCY_FALLBACK_PROVIDER != none`)
3. API key must be present and valid

**Debug**:
```bash
# Check configuration
grep -E "EMERGENCY|GEMINI|CLAUDE|GPT" .env

# Check logs for fallback activation
tail -f /tmp/v9-e2e-output.log | grep -i "fallback"
```

### Problem: Model Not Found

```
Error: Model 'gemini-3.0-flash' not found
```

**Solution**: Model doesn't exist yet. Use current version:
```bash
GEMINI_MODEL=gemini-2.5-pro
```

---

## Best Practices

1. **Always configure emergency fallback** for production:
   ```bash
   EMERGENCY_FALLBACK_PROVIDER=gemini  # Never use "none" in production
   ```

2. **Use provider-specific variables** for flexibility:
   ```bash
   GEMINI_MODEL=gemini-2.5-pro
   CLAUDE_MODEL=claude-sonnet-4-20250514
   # Easy to switch providers without changing model names
   ```

3. **Test fallback regularly**:
   ```bash
   # Monthly validation
   ./scripts/test-emergency-fallback.sh
   ```

4. **Monitor costs**:
   ```bash
   # Check cost impact of fallback usage
   grep "Emergency fallback successful" logs/ | wc -l
   ```

5. **Document your configuration**:
   ```bash
   # Add comment explaining your choice
   # Using Gemini 2.5 Pro for best price/performance ratio
   GEMINI_MODEL=gemini-2.5-pro
   ```

---

## Related Documentation

- OpenRouter Multi-Key Setup: `OPENROUTER_RESILIENCE_STRATEGY.md`
- V9 System Architecture: `V9_SYSTEM_OVERVIEW.md`
- Complete Resilience Strategy: `V9_CRITICAL_KNOWLEDGE_BASE.md`

---

**Last Updated**: 2025-10-05
**Version**: V9.1.0
**Status**: Production Ready ✅
