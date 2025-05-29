# Format-Neutral DeepWiki Parser Implementation

## Overview

The DeepWiki parser has been refactored to use a format-neutral approach that can handle various LLM output formats without requiring explicit support for each model. This eliminates the need to add new patterns every time we encounter a new LLM format.

## Key Changes

### 1. Generic Pattern Matching

Instead of having separate patterns for each LLM (Gemini, GPT-4, DeepSeek), the parser now uses generic patterns that capture common structures:

```typescript
const bulletPointPatterns = [
  // Standard bullet with keyword: value format
  /^[\s]*[-•*]\s*(?:Issue|Problem|Finding|Concern|Vulnerability|Weakness|Gap):\s*(.+?)$/gm,
  
  // Bold keyword format: **Keyword:** value
  /^[\s]*[-•*]\s*\*\*([^:*]+):\*\*\s*(.+?)$/gm,
  
  // Numbered format: 1. Issue: value
  /^[\s]*\d+\.\s*(?:Issue|Problem|Finding):\s*(.+?)$/gm,
  
  // Simple bullet points without keywords (but with context)
  /^[\s]*[-•*]\s*([A-Z][^.!?]*(?:issue|problem|vulnerability|weakness|inefficiency|concern)[^.!?]*[.!?]?)$/gm
];
```

### 2. Flexible File Path Extraction

The parser can now extract file paths from various formats:

```typescript
const filePatterns = [
  /\/\/\s*File:\s*(.+?)(?::(\d+)(?:-\d+)?)?$/m,     // // File: path:line
  /File:\s*`([^`]+)`/,                               // File: `path`
  /\bin\s+`?([^`\s]+\.(?:js|ts|json|jsx|tsx))`?/i,  // in file.js
  /(?:file|path):\s*([^\s]+\.(?:js|ts|json|jsx|tsx))/i // file: path
];
```

### 3. Intelligent Severity Detection

Severity is determined using keyword analysis rather than format-specific rules:

```typescript
private determineSeverity(title: string, description: string, category: string): 'critical' | 'high' | 'medium' | 'low' {
  const text = (title + ' ' + description).toLowerCase();
  
  // Critical severity keywords
  if (text.match(/(?:critical|severe|dangerous|exploit|injection|leak|exposure|unauthorized)/)) {
    return 'critical';
  }
  
  // High severity keywords
  if (text.match(/(?:security|validation|sanitization|authentication|authorization)/) && category === 'security') {
    return 'high';
  }
  
  // ... more severity rules
}
```

### 4. Context-Aware Recommendation Generation

The parser looks for explicit recommendations in the context and generates appropriate ones based on issue type:

```typescript
private generateRecommendation(title: string, description: string | undefined, context: string): string {
  // Look for explicit recommendations in the context
  const recommendationPatterns = [
    /(?:recommendation|suggestion|improve|should|consider|recommend):\s*([^.!?]+[.!?])/i,
    /(?:fix|refactor|update|implement|add|remove):\s*([^.!?]+[.!?])/i
  ];
  
  // Generate based on issue type if no explicit recommendation found
  if (text.includes('validation')) {
    return 'Implement proper input validation and sanitization';
  }
  // ... more recommendation rules
}
```

## Benefits

1. **No Model-Specific Code**: The parser no longer needs explicit patterns for each LLM format
2. **Future-Proof**: Can handle new LLM formats without code changes
3. **Maintainable**: Single set of patterns to maintain instead of multiple
4. **Flexible**: Adapts to variations in formatting within the same LLM
5. **Comprehensive**: Extracts findings from tables, lists, and various markdown structures

## Testing

The format-neutral parser has been tested with:
- Gemini format (Issue/Code Snippet structure)
- GPT-4 format (Bold keywords with descriptions)
- DeepSeek format (Problem/File structure)
- Mixed formats (combinations of the above)

All tests pass successfully, demonstrating the parser's ability to handle diverse formats.

## Usage

The parser API remains unchanged:

```typescript
const parser = new DeepWikiMarkdownParser();
const report = parser.parseMarkdownReport(markdownContent);
```

The parser automatically detects and adapts to the format of the input markdown.