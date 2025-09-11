# Translator Architecture with Vector DB Integration

## Overview

The translator system is fully integrated with CodeQual's existing model selection and research architecture. Instead of hardcoding models, the system uses the researcher to find optimal translation models for each context and stores configurations in the Vector DB.

## Architecture Components

### 1. Translator Roles
Each translation context is treated as a distinct role that can be researched and optimized:

- **API_TRANSLATOR**: Optimizes for JSON structure preservation and speed
- **ERROR_TRANSLATOR**: Focuses on clarity and actionability
- **DOCS_TRANSLATOR**: Prioritizes quality for technical documentation
- **UI_TRANSLATOR**: Balances conciseness with user-friendliness
- **SDK_TRANSLATOR**: Specializes in code comment translation

### 2. Research Integration

The translator system leverages the existing researcher infrastructure:

```typescript
// Each role has specific research prompts
const researchPrompt = getTranslatorResearchPrompt(TranslatorRole.API_TRANSLATOR);

// Research configuration includes role-specific requirements
const researchConfig = {
  researchDepth: 'deep',
  maxCostPerMillion: 5.0,
  minPerformanceThreshold: 8.5,
  customPrompt: researchPrompt
};
```

### 3. Vector DB Storage

Translator configurations are stored in Vector DB with a special repository ID:
- Repository ID: `00000000-0000-0000-0000-000000000002`
- Config Type: `translator_model_configuration`

Configuration schema:
```typescript
interface StoredTranslatorConfig {
  role: TranslatorRole;
  provider: string;
  model: string;
  versionId: string;
  capabilities: {
    translationQuality: number;
    speed: number;
    contextWindow: number;
    languageSupport: number;
    formatPreservation: number;
  };
  pricing: {
    input: number;
    output: number;
  };
  supportedLanguages: string[];
  specialCapabilities: string[];
  testResults?: {
    avgTranslationTime: number;
    accuracyScore: number;
    formatPreservationScore: number;
    testCount: number;
    lastTested: string;
  };
  reason: string;
  timestamp: string;
}
```

### 4. Model Selection Process

1. **Initial Load**: On startup, translator configurations are loaded from Vector DB
2. **Research**: Researcher evaluates models based on role-specific criteria
3. **Storage**: Selected models are stored back to Vector DB
4. **Application**: TranslatorFactory applies configurations to specialized translators

### 5. Quarterly Optimization

The system supports scheduled optimization:
```typescript
// Trigger research every 3 months
const researcherService = new TranslatorResearcherService(user);
await researcherService.researchAllTranslatorRoles({
  researchDepth: 'comprehensive',
  prioritizeCost: true
});
```

## Usage Flow

### 1. Initialize with Vector DB
```typescript
const factory = TranslatorFactory.getInstance();
await factory.initializeWithVectorDB(authenticatedUser);
```

### 2. Translate with Optimal Models
```typescript
const result = await factory.translate({
  content: { message: 'Hello world' },
  targetLanguage: 'es',
  context: 'api'
});
// Uses model selected by researcher for API translation
```

### 3. Trigger Manual Research
```typescript
const researcherService = new TranslatorResearcherService(user);
const result = await researcherService.researchTranslatorRole(
  TranslatorRole.API_TRANSLATOR,
  { prioritizeCost: true }
);
```

## Benefits

1. **No Hardcoded Models**: All models are researched and selected dynamically
2. **Cost Optimization**: Regular research ensures cost-effective model selection
3. **Performance Tracking**: Test results stored for continuous improvement
4. **Unified Architecture**: Reuses existing model selection infrastructure
5. **Automatic Updates**: New models automatically considered during research

## Configuration Management

### Default Configurations
If Vector DB is unavailable, the system falls back to researched defaults:
- API: gpt-3.5-turbo (speed optimized)
- Error: claude-3-sonnet (clarity optimized)
- Docs: claude-3-opus (quality optimized)
- UI: claude-3-haiku (cost optimized)
- SDK: gpt-4-turbo (accuracy optimized)

### Research Criteria
Each role has weighted evaluation criteria:
```typescript
API_TRANSLATOR: {
  qualityWeight: 35,
  speedWeight: 45,
  costWeight: 20
}
```

### Model Requirements
Specific requirements per role:
- Max latency (ms)
- Min quality score
- Max cost per million tokens
- Required language support
- Special capabilities

## Integration Points

1. **ModelVersionSync**: Registers translator models in the canonical model registry
2. **VectorContextService**: Stores and retrieves translator configurations
3. **ResearcherService**: Evaluates and selects optimal models
4. **AuthenticatedUser**: Ensures tenant isolation for configurations

## Example: Complete Integration

```typescript
// 1. Initialize service
const translatorResearcher = new TranslatorResearcherService(user);
await translatorResearcher.initialize();

// 2. Research all roles
const results = await translatorResearcher.researchAllTranslatorRoles();

// 3. Initialize factory with new configs
const factory = TranslatorFactory.getInstance();
await factory.initializeWithVectorDB(user);

// 4. Translate using optimized models
const translation = await factory.translate({
  content: 'Error: File not found',
  targetLanguage: 'es',
  context: 'error'
});
```

## Monitoring and Metrics

The system tracks:
- Translation times per model
- Accuracy scores
- Format preservation quality
- Cost per translation
- Cache hit rates

These metrics inform future research cycles for continuous optimization.