# Database Model Configuration Issues

## Current Problems

1. **Incomplete Model Configurations**
   - Only 3 out of 9 agents have models configured (researcher, educational, reporting)
   - Missing: orchestrator, security, codeQuality, architecture, performance, dependency
   - Only "large" size category has language-specific models
   - Missing small, medium, extra_large configurations for most languages

2. **Model Deduplication Issue**
   - The `refreshModelCache()` method skips duplicate models with `if (models[key]) continue;`
   - This loses context-specific configurations (agent role, language, size)
   - Results in only 4 unique models being loaded instead of proper mappings

3. **Incorrect Default Pricing**
   - System uses hardcoded default pricing (Anthropic: $15/$75 per 1M tokens)
   - Actual Claude 3.5 Sonnet costs much less
   - This makes cost-based scoring inaccurate

4. **Outdated Models in Database**
   - Claude 3.7 Sonnet configured for typescript/small (expensive and outdated)
   - Should be using newer, cheaper models like gpt-4.1-nano

## Expected Configuration

Each of the 9 agents should have:
- Primary model configuration
- Fallback model configuration
- Accurate pricing from Researcher discoveries

Agents needing configuration:
1. orchestrator
2. security
3. codeQuality
4. architecture
5. performance
6. dependency
7. educational ✓ (has config)
8. reporting ✓ (has config)
9. researcher ✓ (has config)

## Recommended Actions

1. **Run Researcher Agent** to discover and store latest models for all agents
2. **Fix Model Loading** - Don't deduplicate, maintain full context
3. **Use Discovered Pricing** - Get pricing from stored model configs, not defaults
4. **Remove Outdated Models** - Replace Claude 3.7 with newer, cheaper alternatives