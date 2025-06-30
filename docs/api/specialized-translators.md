# Specialized Translators Architecture

CodeQual uses a specialized translator architecture where different types of content are handled by optimized translators, each tuned for specific requirements.

## Overview

Instead of a one-size-fits-all approach, we have 5 specialized translators:

| Translator | Context | Optimization | Cache TTL | Primary Use |
|------------|---------|--------------|-----------|-------------|
| **APITranslator** | `api` | Speed (45%), Quality (35%), Cost (20%) | 1 hour | API responses, JSON data |
| **ErrorTranslator** | `error` | Quality (50%), Speed (35%), Cost (15%) | 2 hours | Error messages, exceptions |
| **DocumentationTranslator** | `docs` | Quality (80%), Speed (5%), Cost (15%) | 7 days | Technical docs, README files |
| **UITranslator** | `ui` | Quality (45%), Speed (25%), Cost (30%) | 24 hours | Buttons, labels, tooltips |
| **CodeTranslator** | `sdk` | Quality (70%), Speed (10%), Cost (20%) | 3 days | Code comments, SDKs |

## Architecture

```
TranslatorFactory (Singleton)
    ├── APITranslator
    │   ├── JSON structure preservation
    │   ├── Fast response times
    │   └── Key/value awareness
    ├── ErrorTranslator
    │   ├── Common error dictionary
    │   ├── Actionable suggestions
    │   └── Error code preservation
    ├── DocumentationTranslator
    │   ├── Markdown preservation
    │   ├── Code block handling
    │   └── Chunk processing for long docs
    ├── UITranslator
    │   ├── Length constraints
    │   ├── Common UI terms
    │   └── Cultural adaptation
    └── CodeTranslator
        ├── Comment extraction
        ├── Code structure preservation
        └── Language-specific handling
```

## Usage Examples

### Basic Usage

```typescript
import { TranslatorFactory } from '@codequal/agents/translator/translator-factory';

const factory = TranslatorFactory.getInstance();

// Translate API response
const apiResult = await factory.translate({
  content: {
    status: 'processing',
    message: 'Analysis in progress',
    details: { filesProcessed: 10 }
  },
  targetLanguage: 'es',
  context: 'api'
});

// Translate error message
const errorResult = await factory.translate({
  content: 'Authentication failed: Invalid API key',
  targetLanguage: 'ja',
  context: 'error',
  options: {
    includeSuggestions: true
  }
});
```

### Quick Translation

```typescript
import { quickTranslate } from '@codequal/agents/translator/translator-factory';

// Auto-detect context and translate
const translated = await quickTranslate(
  'Click here to continue',
  'zh',  // Chinese
  'ui'   // Optional context hint
);
```

### Batch Translation

```typescript
// Translate multiple items efficiently
const results = await factory.translateBatch([
  {
    content: 'Save',
    targetLanguage: 'de',
    context: 'ui'
  },
  {
    content: 'Cancel',
    targetLanguage: 'de',
    context: 'ui'
  },
  {
    content: { error: 'Not found' },
    targetLanguage: 'de',
    context: 'error'
  }
]);
```

## Specialized Features

### APITranslator

**Features:**
- Preserves JSON structure
- Never translates keys, only values
- Handles nested objects
- Preserves data types (numbers, booleans, null)

**Example:**
```typescript
const result = await factory.translate({
  content: {
    user: {
      name: 'John',
      status: 'active',
      message: 'Welcome back!'
    }
  },
  targetLanguage: 'fr',
  context: 'api',
  options: {
    preserveKeys: true  // Default for API
  }
});

// Result:
// {
//   user: {
//     name: 'John',
//     status: 'active',
//     message: 'Bienvenue!'
//   }
// }
```

### ErrorTranslator

**Features:**
- Common error dictionary for instant translation
- Adds helpful suggestions
- Preserves error codes
- Technical level adjustment

**Example:**
```typescript
const result = await factory.translate({
  content: {
    error: 'Rate limit exceeded',
    code: 'RATE_LIMIT',
    details: { limit: 1000, remaining: 0 }
  },
  targetLanguage: 'es',
  context: 'error',
  options: {
    technicalLevel: 'beginner',
    includeSuggestions: true
  }
});
```

### DocumentationTranslator

**Features:**
- Preserves markdown formatting
- Handles code blocks without translation
- Chunk processing for long documents
- Glossary support

**Example:**
```typescript
const result = await factory.translate({
  content: `# Getting Started
  
  Install the package:
  \`\`\`bash
  npm install @codequal/api-client
  \`\`\`
  
  Then import and use:`,
  targetLanguage: 'ja',
  context: 'docs',
  options: {
    format: 'markdown',
    glossary: {
      'package': 'パッケージ',
      'import': 'インポート'
    }
  }
});
```

### UITranslator

**Features:**
- Length constraints for UI space
- Common UI terms dictionary
- Cultural adaptations
- Variable preservation

**Example:**
```typescript
const result = await factory.translate({
  content: 'Hello {userName}, you have {count} new messages',
  targetLanguage: 'ko',
  context: 'ui',
  options: {
    maxLength: 50,
    context: 'tooltip',
    variables: {
      userName: 'string',
      count: 'number'
    }
  }
});
```

### CodeTranslator

**Features:**
- Extracts and translates only comments
- Preserves code structure
- Handles multiple comment styles
- Language-specific processing

**Example:**
```typescript
const result = await factory.translate({
  content: `
  /**
   * Calculate the total price
   * @param items - List of items
   * @returns Total price
   */
  function calculateTotal(items) {
    // Sum all item prices
    return items.reduce((sum, item) => sum + item.price, 0);
  }`,
  targetLanguage: 'pt',
  context: 'sdk',
  options: {
    codeLanguage: 'javascript',
    translateInlineComments: true,
    preserveJSDoc: true
  }
});
```

## Model Selection

Each translator uses the TranslatorResearcher to select optimal models based on:

1. **Context requirements** (speed vs quality vs cost)
2. **Target language** (some models excel at specific languages)
3. **Content type** (technical vs conversational)
4. **Special capabilities** (JSON support, formatting preservation)

### Weight Distribution

| Context | Quality | Speed | Cost | Example Model Selection |
|---------|---------|-------|------|------------------------|
| API | 35% | 45% | 20% | GPT-3.5-turbo (balanced) |
| Error | 50% | 35% | 15% | Claude-3-sonnet (clarity) |
| Docs | 80% | 5% | 15% | GPT-4-turbo (accuracy) |
| UI | 45% | 25% | 30% | GPT-3.5-turbo (cost-effective) |
| SDK | 70% | 10% | 20% | Claude-3-opus (technical) |

## Performance Optimization

### Caching Strategy

Each translator implements intelligent caching:

```typescript
// Cache TTLs by context
API: 1 hour      // Dynamic content
Error: 2 hours   // Semi-static
UI: 24 hours     // Stable
Docs: 7 days     // Very stable
SDK: 3 days      // Stable
```

### Batch Processing

Reduce API calls with batch translation:

```typescript
// Inefficient: Multiple API calls
for (const item of items) {
  await translate(item);
}

// Efficient: Single batched call
const results = await factory.translateBatch(items);
```

### Pre-warming Cache

For production, pre-warm common translations:

```typescript
// On startup
await warmupTranslations([
  { content: 'Loading...', languages: ['es', 'zh', 'ja'], context: 'ui' },
  { content: 'Error', languages: ['es', 'zh', 'ja'], context: 'error' },
  // ... more common phrases
]);
```

## Best Practices

1. **Use the right context** - Don't use 'docs' for API responses
2. **Batch when possible** - Group similar translations
3. **Provide options** - Help translators with context hints
4. **Cache strategically** - Leverage built-in caching
5. **Monitor costs** - Higher quality contexts cost more

## Statistics and Monitoring

```typescript
// Get translator statistics
const stats = factory.getStatistics();
console.log(stats);
// {
//   api: { cacheSize: 234, cacheHitRate: 0.85 },
//   error: { cacheSize: 45, cacheHitRate: 0.92 },
//   // ...
// }

// Clear caches when needed
factory.clearAllCaches();
```

## Error Handling

All translators implement graceful fallbacks:

```typescript
try {
  const result = await factory.translate(request);
} catch (error) {
  // Translators return original content on failure
  // Error is logged but not thrown to user
}
```

## Future Enhancements

1. **Custom translators** - Plugin architecture for domain-specific needs
2. **Translation memory** - Reuse previous translations
3. **Quality scoring** - Rate translation quality
4. **A/B testing** - Compare different models
5. **Cost optimization** - Automatic model downgrade for budget limits