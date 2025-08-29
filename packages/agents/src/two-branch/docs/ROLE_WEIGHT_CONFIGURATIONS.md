# Role-Based Model Weight Configurations

## Weight Distribution Philosophy

Each role has different priorities that should be reflected in model selection weights:

## Core Weight Profiles

### 1. Analysis-Heavy Roles (Quality First)
**For: DeepWiki, Security, Architecture**
```typescript
{
  quality: 0.45,        // Top priority - accuracy is critical
  speed: 0.15,          // Less important - can wait for good results
  cost: 0.20,           // Moderate - willing to pay for quality
  freshness: 0.10,      // Important - latest security patterns
  contextWindow: 0.10   // Moderate - need decent context
}
```
**Rationale**: These roles need maximum accuracy. Wrong security analysis or architectural assessment can be costly.

### 2. Interactive Roles (Balanced Speed/Quality)
**For: Educator, Orchestrator**
```typescript
{
  quality: 0.30,        // Important but not critical
  speed: 0.35,          // High - user waiting for response
  cost: 0.20,           // Moderate consideration
  freshness: 0.05,      // Less critical
  contextWindow: 0.10   // Standard needs
}
```
**Rationale**: Users expect quick responses for educational content and orchestration decisions.

### 3. High-Volume Roles (Cost-Optimized)
**For: Code Quality, Testing, Documentation**
```typescript
{
  quality: 0.25,        // Good enough quality
  speed: 0.25,          // Balanced with quality
  cost: 0.35,           // High priority - runs frequently
  freshness: 0.05,      // Less important
  contextWindow: 0.10   // Standard needs
}
```
**Rationale**: These run on every PR, so cost matters. Quality issues can be caught in review.

### 4. Performance-Critical Roles (Speed First)
**For: Location Finder, Comparator**
```typescript
{
  quality: 0.25,        // Acceptable quality
  speed: 0.40,          // Top priority - fast iteration
  cost: 0.25,           // Important for frequent use
  freshness: 0.05,      // Less critical
  contextWindow: 0.05   // Minimal needs
}
```
**Rationale**: These roles run multiple times per analysis, speed is crucial.

### 5. Research Roles (Freshness & Quality)
**For: Researcher**
```typescript
{
  quality: 0.35,        // High - need accurate research
  speed: 0.15,          // Can be slower
  cost: 0.15,           // Less concern
  freshness: 0.25,      // Very important - latest info
  contextWindow: 0.10   // Standard needs
}
```
**Rationale**: Needs latest models that know about recent developments.

## Detailed Role Weight Matrix

| Role | Quality | Speed | Cost | Freshness | Context | Justification |
|------|---------|-------|------|-----------|---------|---------------|
| **DeepWiki** | 0.45 | 0.15 | 0.20 | 0.10 | 0.10 | Deep analysis needs accuracy above all |
| **Security** | 0.50 | 0.10 | 0.20 | 0.15 | 0.05 | Security vulnerabilities must be accurate |
| **Performance** | 0.35 | 0.25 | 0.25 | 0.05 | 0.10 | Balance accuracy with practical speed |
| **Architecture** | 0.40 | 0.15 | 0.20 | 0.10 | 0.15 | Need quality + large context for design |
| **Code Quality** | 0.25 | 0.25 | 0.35 | 0.05 | 0.10 | Runs frequently, cost matters |
| **Testing** | 0.30 | 0.20 | 0.35 | 0.05 | 0.10 | Generate many tests, cost sensitive |
| **Documentation** | 0.25 | 0.30 | 0.30 | 0.05 | 0.10 | Quick docs generation, cost aware |
| **Comparator** | 0.30 | 0.35 | 0.25 | 0.05 | 0.05 | Fast PR comparison needed |
| **Location Finder** | 0.25 | 0.40 | 0.25 | 0.05 | 0.05 | Speed critical for finding locations |
| **Educator** | 0.30 | 0.35 | 0.20 | 0.05 | 0.10 | Interactive teaching needs speed |
| **Orchestrator** | 0.25 | 0.40 | 0.25 | 0.05 | 0.05 | Fast routing decisions |
| **Researcher** | 0.35 | 0.15 | 0.15 | 0.25 | 0.10 | Needs latest knowledge |

## Language-Specific Weight Adjustments

### Complex Languages (Rust, C++, Scala)
```typescript
// Multiply quality weight by 1.15
weights.quality *= 1.15;
// Reduce other weights proportionally
weights.speed *= 0.95;
weights.cost *= 0.95;
```
**Rationale**: Complex languages need better understanding.

### Scripting Languages (Python, JavaScript, Ruby)
```typescript
// Increase speed weight by 1.10
weights.speed *= 1.10;
// Slightly reduce quality
weights.quality *= 0.95;
```
**Rationale**: Simpler syntax allows faster processing.

### Enterprise Languages (Java, C#)
```typescript
// Increase quality weight by 1.10
weights.quality *= 1.10;
// Increase context window needs
weights.contextWindow *= 1.20;
```
**Rationale**: Complex enterprise patterns need careful analysis.

## Repository Size Weight Adjustments

### Small Repositories (< 50 files)
```typescript
// Increase speed significantly
weights.speed *= 1.30;
// Reduce cost concern (quick to run)
weights.cost *= 0.80;
// Can afford higher quality
weights.quality *= 1.10;
```
**Rationale**: Small repos can be analyzed thoroughly and quickly.

### Medium Repositories (50-500 files)
```typescript
// Balanced - no adjustments
// Use base weights for role
```
**Rationale**: Standard case, no special adjustments needed.

### Large Repositories (> 500 files)
```typescript
// Increase quality (sampling requires accuracy)
weights.quality *= 1.15;
// Increase context window significantly
weights.contextWindow *= 1.50;
// Speed less important (will take time anyway)
weights.speed *= 0.85;
```
**Rationale**: Large repos need accurate sampling and large context.

## Weight Calculation Example

### Security Agent + JavaScript + Large Repo

**Base Weights (Security)**:
```typescript
{
  quality: 0.50,
  speed: 0.10,
  cost: 0.20,
  freshness: 0.15,
  contextWindow: 0.05
}
```

**Apply JavaScript Adjustment**:
```typescript
quality: 0.50 * 0.95 = 0.475
speed: 0.10 * 1.10 = 0.11
// Others unchanged
```

**Apply Large Repo Adjustment**:
```typescript
quality: 0.475 * 1.15 = 0.546
speed: 0.11 * 0.85 = 0.094
contextWindow: 0.05 * 1.50 = 0.075
```

**Final Normalized Weights**:
```typescript
{
  quality: 0.55,
  speed: 0.09,
  cost: 0.19,
  freshness: 0.14,
  contextWindow: 0.08
}
// (normalized to sum to 1.0)
```

## Model Selection Impact

### High Quality Weight (>0.40)
- Prefer: Claude Opus 4.1, GPT-5, Gemini Ultra
- Avoid: Mini models, speed-optimized variants

### High Speed Weight (>0.35)
- Prefer: GPT-5-turbo, Claude Instant, Gemini Flash
- Avoid: Large models, ultra variants

### High Cost Weight (>0.30)
- Prefer: Open source models, smaller variants
- Avoid: Premium models, large context models

### High Freshness Weight (>0.20)
- Prefer: Models released in last 1-2 months
- Avoid: Models older than 3 months

### High Context Weight (>0.15)
- Prefer: 100k+ context models
- Avoid: Models with <32k context

## Implementation in Researcher

```typescript
function calculateFinalWeights(
  role: string,
  language: string,
  repoSize: 'small' | 'medium' | 'large'
): Weights {
  // Start with base role weights
  let weights = { ...ROLE_BASE_WEIGHTS[role] };
  
  // Apply language adjustments
  weights = applyLanguageAdjustments(weights, language);
  
  // Apply size adjustments
  weights = applySizeAdjustments(weights, repoSize);
  
  // Normalize to sum to 1.0
  return normalizeWeights(weights);
}
```

## Validation Rules

1. **Weights must sum to 1.0** (±0.01 tolerance)
2. **No weight below 0.05** (every factor matters somewhat)
3. **No weight above 0.60** (avoid over-optimization)
4. **Document reasoning** for any unusual distributions

## Special Cases

### Emergency Fix Mode
```typescript
// When critical security fix needed urgently
{
  quality: 0.60,  // Maximum accuracy
  speed: 0.30,    // Still need it fast
  cost: 0.05,     // Cost irrelevant
  freshness: 0.03,
  contextWindow: 0.02
}
```

### Budget-Conscious Mode
```typescript
// For open source projects with limited budget
{
  quality: 0.20,
  speed: 0.20,
  cost: 0.50,    // Cost is primary concern
  freshness: 0.05,
  contextWindow: 0.05
}
```

### Research-Heavy Mode
```typescript
// For discovering new patterns/vulnerabilities
{
  quality: 0.35,
  speed: 0.10,
  cost: 0.15,
  freshness: 0.30,  // Need latest knowledge
  contextWindow: 0.10
}
```

## Testing Weight Configurations

Each weight configuration should be tested with:

1. **Expected model selection** - Does it choose appropriate models?
2. **Performance metrics** - Does it meet role requirements?
3. **Cost analysis** - Is it within budget expectations?
4. **Quality validation** - Are results accurate enough?

## Update Frequency

- Review weights **monthly** based on performance data
- Adjust based on user feedback
- Update when new model capabilities emerge
- Rebalance when costs change significantly