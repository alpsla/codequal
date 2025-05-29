
import { ClaudeAgent } from '../src/claude/claude-agent';
import { Insight, Suggestion } from '@codequal/core';

// Mock Claude API response
const mockClaudeResponse = `
## Insights
- [high] The function fillPromptTemplate doesn't validate inputs, which could lead to template injection vulnerabilities.
- [medium] No error handling for API calls, which might cause silent failures.
- [low] Variable names are not consistent across the codebase.

## Suggestions
- File: claude-agent.ts, Line: 120, Suggestion: Add input validation to prevent template injection.
- File: claude-agent.ts, Line: 156, Suggestion: Implement proper error handling with try/catch blocks.
- File: claude-agent.ts, Line: 78, Suggestion: Use consistent naming conventions for variables.

## Educational
### Template Injection Vulnerabilities
Template injection occurs when user input is directly inserted into templates without proper validation. This can lead to unexpected behavior or security vulnerabilities. Always validate and sanitize inputs before using them in templates.

### Error Handling Best Practices
Proper error handling improves application reliability and user experience. Use try/catch blocks for async operations, provide meaningful error messages, and ensure errors are logged for debugging.
`;

// Debug function to investigate the parsing issue
function debugParsing() {
  console.log("=== DEBUG CLAUDE AGENT PARSING ===");
  
  // Extract sections using regex
  const insightsMatch = mockClaudeResponse.match(/## Insights\s+([\s\S]*?)(?=##|$)/i);
  const suggestionsMatch = mockClaudeResponse.match(/## Suggestions\s+([\s\S]*?)(?=##|$)/i);
  
  // Debug insights parsing
  if (insightsMatch && insightsMatch[1]) {
    const insightsText = insightsMatch[1].trim();
    console.log("=== INSIGHTS TEXT ===");
    console.log(JSON.stringify(insightsText));
    
    // Original splitting approach
    const originalInsightItems = insightsText.split(/\n\s*-\s*/);
    console.log("=== ORIGINAL INSIGHTS ITEMS ===");
    console.log("Total items:", originalInsightItems.length);
    originalInsightItems.forEach((item, index) => {
      console.log(`Item ${index}:`, JSON.stringify(item));
    });
    
    // New splitting approach
    const newInsightItems = ('\n' + insightsText).split(/\n\s*-\s*/);
    console.log("=== NEW INSIGHTS ITEMS ===");
    console.log("Total items:", newInsightItems.length);
    newInsightItems.forEach((item, index) => {
      console.log(`Item ${index}:`, JSON.stringify(item));
    });
    
    // Process the new insight items
    const processedInsights: Insight[] = [];
    for (let i = 1; i < newInsightItems.length; i++) {
      const item = newInsightItems[i];
      if (!item.trim()) continue;
      
      const severityMatch = item.match(/\[(high|medium|low)\]/i);
      const severity = severityMatch ? severityMatch[1].toLowerCase() as 'high' | 'medium' | 'low' : 'medium';
      // Remove the severity tag and any leading dash or whitespace
      const message = item.replace(/\[(high|medium|low)\]/i, '').replace(/^\s*-\s*/, '').trim();
      
      if (message) {
        processedInsights.push({
          type: 'code_review',
          severity,
          message
        });
      }
    }
    console.log("=== PROCESSED INSIGHTS ===");
    console.log("Total processed:", processedInsights.length);
    processedInsights.forEach((insight, index) => {
      console.log(`Insight ${index}:`, JSON.stringify(insight));
    });
  }
  
  // Debug suggestions parsing
  if (suggestionsMatch && suggestionsMatch[1]) {
    const suggestionsText = suggestionsMatch[1].trim();
    console.log("\n=== SUGGESTIONS TEXT ===");
    console.log(JSON.stringify(suggestionsText));
    
    // Original splitting approach
    const originalSuggestionItems = suggestionsText.split(/\n\s*-\s*/);
    console.log("=== ORIGINAL SUGGESTIONS ITEMS ===");
    console.log("Total items:", originalSuggestionItems.length);
    originalSuggestionItems.forEach((item, index) => {
      console.log(`Item ${index}:`, JSON.stringify(item));
    });
    
    // New splitting approach
    const newSuggestionItems = ('\n' + suggestionsText).split(/\n\s*-\s*/);
    console.log("=== NEW SUGGESTIONS ITEMS ===");
    console.log("Total items:", newSuggestionItems.length);
    newSuggestionItems.forEach((item, index) => {
      console.log(`Item ${index}:`, JSON.stringify(item));
    });
    
    // Process the new suggestion items
    const processedSuggestions: Suggestion[] = [];
    for (let i = 1; i < newSuggestionItems.length; i++) {
      const item = newSuggestionItems[i];
      if (!item.trim()) continue;
      
      const fileMatch = item.match(/File:\s*([^,]+),/i);
      const lineMatch = item.match(/Line:\s*(\d+)/i);
      
      if (fileMatch) {
        const file = fileMatch[1].trim();
        const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
        const suggestionText = item
          .replace(/File:\s*[^,]+,/i, '')
          .replace(/Line:\s*\d+/i, '')
          .replace(/Suggestion:/i, '')
          .trim();

        // Remove any leading dash, comma, or whitespace
        const suggestion = suggestionText.replace(/^[\s,-]*/, '').trim();
        
        if (suggestion) {
          processedSuggestions.push({
            file,
            line,
            suggestion
          });
        }
      }
    }
    console.log("=== PROCESSED SUGGESTIONS ===");
    console.log("Total processed:", processedSuggestions.length);
    processedSuggestions.forEach((suggestion, index) => {
      console.log(`Suggestion ${index}:`, JSON.stringify(suggestion));
    });
  }
}

// Run the debug function
debugParsing();
