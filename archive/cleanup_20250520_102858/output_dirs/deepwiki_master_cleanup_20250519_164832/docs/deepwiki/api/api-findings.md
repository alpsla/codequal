# DeepWiki API Integration Findings

## Overview

Based on our testing of the DeepWiki API, we've identified the working endpoints, parameters, and providers to use for our integration. This document summarizes our findings and provides recommendations for the DeepWikiClient implementation.

## Working Endpoints

1. **Chat Completions**: `/chat/completions/stream`
   - **Status**: Confirmed working
   - **Providers**: OpenAI and Google work reliably
   - **Response Times**:
     - OpenAI GPT-4o: ~9 seconds
     - Google Gemini: ~12 seconds
   - **Response Quality**: Both provide comprehensive responses with good structure

2. **Wiki Export**: `/export/wiki`
   - **Status**: Requires additional work
   - **Issues**: Requires very specific page structure format
   - **Fields Required**: id, title, path, content, filePaths, importance, relatedPages

## API Parameters

### Chat Completions

```json
{
  "repo_url": "https://github.com/owner/repo",
  "messages": [
    {
      "role": "user",
      "content": "What is the overall architecture of this repository?"
    }
  ],
  "provider": "openai",
  "model": "gpt-4o"
}
```

Key findings:
- The endpoint must include `/stream` suffix (`/chat/completions/stream`)
- Basic parameters are `repo_url` and `messages[]`
- Provider and model are optional but work correctly

### Wiki Export

```json
{
  "repo_url": "https://github.com/owner/repo",
  "pages": [
    {
      "id": "main",
      "title": "Main Documentation",
      "path": "",
      "content": "",
      "filePaths": ["README.md", "CONTRIBUTING.md", "LICENSE"],
      "importance": 1,
      "relatedPages": []
    }
  ],
  "format": "json",
  "language": "en",
  "provider": "openai",
  "model": "gpt-4o"
}
```

Key findings:
- Requires specific structure for the `pages` array
- Format must be `json` or `markdown` (not `md`)
- All page object fields are required (id, title, path, content, filePaths, importance, relatedPages)

## Provider Performance Comparison

Based on our tests with the `/chat/completions/stream` endpoint:

| Provider | Model | Response Time | Response Size | Quality Assessment |
|----------|-------|---------------|---------------|-------------------|
| OpenAI   | gpt-4o | 9 seconds     | ~1.5 KB       | Excellent - Comprehensive structure, good explanations |
| Google   | gemini-2.5-pro | 12 seconds    | ~3 KB        | Very Good - More verbose, detailed code component explanations |
| Anthropic | claude-3-7-sonnet | N/A (API key issue) | N/A | Could not test without API key |

The responses from both OpenAI and Google models were high quality with some differences:
- OpenAI GPT-4o: More concise, good hierarchical structure, focused on architecture
- Google Gemini: More verbose, detailed file-by-file explanations, more code-focused

## Error Handling

Common errors encountered:
1. **404 Not Found**: When using incorrect endpoints 
2. **Validation Errors**: When missing required fields in the request
3. **Provider Configuration**: When provider-specific API keys are not available

Error response format:
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "pages", 0, "id"],
      "msg": "Field required", 
      "input": {"path": "README.md"}
    },
    // Additional validation errors...
  ]
}
```

## Recommendations for DeepWikiClient Implementation

1. **Focus on Chat Completions**: 
   - Prioritize the `/chat/completions/stream` endpoint which works reliably
   - Use structured queries to get targeted information
   - Defer wiki export functionality until further testing

2. **Provider Selection**:
   - Default to OpenAI GPT-4o for small repositories (<5MB)
   - Use Google Gemini for medium to large repositories
   - Add fallback support between providers

3. **Error Handling**:
   - Implement robust error handling for validation errors
   - Add retry mechanisms with exponential backoff
   - Provide clear error messages based on the API responses

4. **Repository Size Handling**:
   - Implement detection of repository size
   - For large repositories, consider using targeted queries instead of full analysis
   - Develop a chunking strategy for very large repositories

5. **Model Optimization**:
   - Maintain a mapping of optimal models per language and repository size
   - Update this mapping based on performance metrics
   - Allow manual override of model selection

## Changes to Three-Tier Analysis Approach

Based on our findings, we should modify our approach:

1. **Quick PR Analysis**:
   - Continue with targeted chat queries about the PR
   - Use OpenAI GPT-4o for reliability and speed

2. **Comprehensive Analysis**:
   - Use a series of chat queries rather than wiki export
   - Break down the analysis into targeted components
   - Combine the results into a comprehensive view

3. **Targeted Deep Dives**:
   - Continue with focused chat queries by perspective
   - Optimize provider/model selection based on perspective type

## Implementation Priorities

1. Update DeepWikiClient to use the correct endpoints
2. Implement error handling and retries
3. Create a query strategy for repository analysis
4. Develop model selection optimization
5. Implement repository size detection and handling

## Next Steps

1. Test the updated DeepWikiClient with various repositories
2. Collect metrics on provider/model performance by repository type
3. Refine the model selection strategy
4. Develop a fallback mechanism for API failures
5. Integrate with the broader CodeQual orchestration system

## Conclusion

The DeepWiki API provides valuable repository analysis capabilities through its chat completion endpoint. While the wiki export functionality requires additional work, we can achieve our goals by focusing on structured chat queries. The updated DeepWikiClient implementation reflects these findings and will provide a robust integration with the DeepWiki service.
