# Researcher Reset Summary

## Current Status
- **Current Model**: `nousresearch/nous-hermes-2-mixtral-8x7b-dpo` (Quality: 6.5/10, Cost: $0.60/M)
- **Last Research**: June 27, 2025
- **System**: Using old hardcoded model selection

## What Will Happen When You Run Research

### 1. Dynamic Model Discovery
The system will:
- Fetch all 319+ models from OpenRouter
- Filter out embedding and vision models
- Keep only code-capable models with pricing

### 2. Dynamic Evaluation (No Hardcoded Models!)
Each model is evaluated based on patterns:
- **Size indicators**: 70b, 40b, 7b → larger = higher quality
- **Version patterns**: 4.5 > 4.0, 2.5 > 2.0 → newer = better
- **Speed indicators**: turbo, flash, fast → optimized for speed
- **Premium tiers**: opus, ultra → highest quality
- **Freshness**: Current year models get bonus, old patterns get penalties

### 3. Expected Model Updates
Based on our tests, the researcher will likely select:
- **Primary**: `google/gemini-2.5-flash` (Quality: 8.3, Speed: 9.0, Cost: 10.0)
- **Fallback**: `google/gemini-2.5-pro` or similar high-quality model

This is a significant upgrade from the current Mixtral model!

### 4. All Agents Will Be Updated
The system will select optimal models for all 10 roles:
- `deepwiki` - Deep code analysis
- `researcher` - Model discovery (self-improving!)
- `security` - Vulnerability detection
- `architecture` - System design
- `performance` - Optimization
- `code_quality` - Code review
- `dependencies` - Package analysis
- `documentation` - Doc generation
- `testing` - Test creation
- `translator` - Code translation

### 5. Schedule Reset
- **Immediate execution**: Research runs now
- **Next run**: First day of the month, 3 months from today
- **Cron**: `0 9 1 */3 *` (9 AM UTC on 1st day of every 3rd month)

## How to Trigger

```bash
# Get fresh JWT token from browser, then:
curl -X POST http://localhost:3001/api/researcher/research \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"trigger": "manual", "reason": "Reset scheduler to run immediately"}'
```

## Benefits of the New System
1. **Self-maintaining**: No more hardcoded model names
2. **Always current**: Automatically discovers new models
3. **Intelligent selection**: AI-powered final selection for complex decisions
4. **Cost optimized**: Balances quality with cost for each role
5. **Future-proof**: When GPT-5, Claude 5, etc. are released, they'll be automatically evaluated and adopted