# Researcher Agent Dynamic Date Request

## CRITICAL: NO HARDCODED DATES

### ⚠️ ALWAYS USE DYNAMIC DATES
```typescript
// ❌ WRONG - Never hardcode dates
const searchQuery = "latest AI models August 2025";

// ✅ CORRECT - Always use current date
const currentDate = new Date();
const monthName = currentDate.toLocaleString('default', { month: 'long' });
const year = currentDate.getFullYear();
const searchQuery = `latest AI models ${monthName} ${year}`;
```

## Dynamic Date Implementation

### 1. Get Current Date Dynamically
```typescript
function getCurrentTimeContext() {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  return {
    currentDate: now.toISOString(),
    currentMonth: now.toLocaleString('default', { month: 'long' }),
    currentYear: now.getFullYear(),
    sixMonthsAgoDate: sixMonthsAgo.toISOString(),
    sixMonthsAgoMonth: sixMonthsAgo.toLocaleString('default', { month: 'long' }),
    sixMonthsAgoYear: sixMonthsAgo.getFullYear()
  };
}
```

### 2. Dynamic Search Query Generation
```typescript
function generateSearchQueries() {
  const context = getCurrentTimeContext();
  
  return [
    `latest AI models ${context.currentMonth} ${context.currentYear}`,
    `newest LLM releases ${context.currentYear}`,
    `Claude GPT Gemini latest versions ${context.currentMonth} ${context.currentYear}`,
    `OpenRouter available models ${context.currentYear}`,
    `AI models released since ${context.sixMonthsAgoMonth} ${context.sixMonthsAgoYear}`,
    `best code analysis models ${context.currentYear}`,
    `recent LLM updates last 6 months ${context.currentYear}`
  ];
}
```

### 3. Model Age Validation
```typescript
function isModelRecent(modelReleaseDate: string): boolean {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  const releaseDate = new Date(modelReleaseDate);
  
  // Model must be less than 6 months old
  return releaseDate >= sixMonthsAgo;
}
```

## Updated Research Process

### Step 1: Initialize with Current Date
```typescript
const researchContext = {
  timestamp: new Date().toISOString(),
  searchPeriod: {
    from: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
    to: new Date().toISOString()
  }
};
```

### Step 2: Generate Dynamic Search Queries
```typescript
const queries = generateSearchQueries();
// Produces queries like:
// - "latest AI models December 2025" (if run in December 2025)
// - "latest AI models March 2026" (if run in March 2026)
// - "latest AI models July 2027" (if run in July 2027)
```

### Step 3: Validate Model Recency
```typescript
for (const model of discoveredModels) {
  if (!isModelRecent(model.releaseDate)) {
    console.log(`Rejecting ${model.name}: Too old (released ${model.releaseDate})`);
    continue;
  }
  // Model is recent enough
  candidateModels.push(model);
}
```

## Configuration Output with Dynamic Timestamps

```typescript
{
  role: 'security',
  language: 'javascript',
  size_category: 'medium',
  primary: {
    provider: 'anthropic',
    model: 'claude-opus-latest', // Discovered dynamically
    reasoning: [
      `Latest Claude Opus version as of ${new Date().toLocaleDateString()}`,
      'Excellent at security pattern recognition',
      `Released within last 6 months from ${new Date().toISOString()}`
    ]
  },
  fallback: {
    provider: 'openai',
    model: 'gpt-latest', // Discovered dynamically
    reasoning: [
      `Latest GPT version available as of ${new Date().toLocaleDateString()}`,
      'Good security analysis capabilities',
      'Lower cost than primary'
    ]
  },
  weights: {
    quality: 0.45,
    speed: 0.15,
    cost: 0.20,
    freshness: 0.10,
    contextWindow: 0.10
  },
  search_queries_used: generateSearchQueries(), // Dynamic queries
  models_considered: [
    { 
      model: 'claude-opus-dynamic', 
      score: 8.5, 
      reason: 'selected as primary',
      discovered_date: new Date().toISOString()
    }
  ],
  timestamp: new Date().toISOString(), // Current timestamp
  valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Valid for 30 days
}
```

## Error Messages with Dynamic Dates

```typescript
if (candidateModels.length === 0) {
  const context = getCurrentTimeContext();
  throw new Error(
    `No suitable models found for configuration:
     Role: ${role}, Language: ${language}, Size: ${size}
     Search period: ${context.sixMonthsAgoMonth} ${context.sixMonthsAgoYear} to ${context.currentMonth} ${context.currentYear}
     Current date: ${context.currentDate}
     Please check if new models have been released or expand search timeframe`
  );
}
```

## Implementation in Production

```typescript
export class ModelResearcher {
  private getCurrentContext() {
    return {
      timestamp: new Date().toISOString(),
      searchWindow: this.getSearchWindow(),
      queries: this.generateDynamicQueries()
    };
  }
  
  private getSearchWindow() {
    const now = new Date();
    const past = new Date();
    past.setMonth(now.getMonth() - 6); // Always 6 months back from current date
    
    return {
      from: past.toISOString(),
      to: now.toISOString(),
      description: `Models from ${past.toLocaleDateString()} to ${now.toLocaleDateString()}`
    };
  }
  
  async researchModels(context: ResearchContext) {
    const timeContext = this.getCurrentContext();
    
    // Log the actual time window being used
    console.log(`Researching models for time window: ${timeContext.searchWindow.description}`);
    
    // Use dynamic queries
    const searchResults = await this.searchWeb(timeContext.queries);
    
    // Validate all models are within time window
    const validModels = searchResults.filter(model => 
      this.isWithinTimeWindow(model.releaseDate, timeContext.searchWindow)
    );
    
    return this.selectBestModels(validModels, context);
  }
}
```

## Benefits of Dynamic Dates

1. **Future-Proof**: Works correctly whether run today, next year, or in 5 years
2. **Always Current**: Automatically searches for the latest models relative to execution time
3. **No Maintenance**: Never needs manual date updates
4. **Clear Audit Trail**: Timestamps show exactly when research was performed
5. **Automatic Expiry**: Configs know when they need refresh (30 days from creation)

## Example Execution Timeline

- **Run on Aug 29, 2025**: Searches for models from Feb 2025 to Aug 2025
- **Run on Dec 15, 2025**: Searches for models from Jun 2025 to Dec 2025
- **Run on Mar 10, 2026**: Searches for models from Sep 2025 to Mar 2026
- **Run on Jan 1, 2030**: Searches for models from Jul 2029 to Jan 2030

The system always looks for models from the last 6 months, regardless of when it's executed!