# DeepWiki Data Quality Report
## Session: 2025-08-27

---

## Executive Summary

DeepWiki is returning **unstructured plain text** responses instead of the structured JSON data our system expects. This causes cascading failures throughout the analysis pipeline, resulting in reports with placeholder text and incorrect fix suggestions.

---

## Key Findings

### 1. Mock vs Real DeepWiki Comparison

| Aspect | Mock Mode | Real DeepWiki |
|--------|-----------|---------------|
| **Response Format** | Structured text that we parse | Plain text sentences |
| **File Paths** | Fake paths (files don't exist) | Generic references (e.g., "index.js") |
| **Line Numbers** | Random numbers | Sometimes provided, often vague |
| **Code Snippets** | Not provided | Not provided |
| **Issue Details** | Generic security issues | Generic descriptions |

### 2. Actual DeepWiki Response Example

**Request:**
```
"Find one security issue in this repository with exact file path and line number"
```

**Response:**
```
The repository contains a potential security issue in the file `index.js` at line 86, 
where user input is directly passed to the `URL` constructor without validation or 
sanitization, which can lead to vulnerabilities such as URL injection.
```

### 3. Problems Identified

#### Data Quality Issues:
1. **No structured format** - Plain text instead of JSON
2. **No code snippets** - Just descriptions
3. **Vague file references** - "index.js" without full path
4. **No categorization** - Severity, type, category missing
5. **No fix suggestions** - Just problem descriptions

#### Pipeline Failures:
1. **Parser struggles** - Tries to extract structure from sentences
2. **Code extraction fails** - Can't find files with vague references
3. **Fix generation fails** - No real code to analyze
4. **Reports have placeholders** - `// Code location: unknown`

---

## Root Cause Analysis

### Why Mock Mode "Works" Better:
- Mock returns semi-structured text we can parse
- Even though files don't exist, we have consistent format
- We can extract file paths and line numbers (even if wrong)

### Why Real DeepWiki Fails:
- Returns conversational text, not data
- Designed for chat, not structured analysis
- No consistent format to parse
- Missing critical metadata

---

## Impact on Reports

### Current Report Issues:
```markdown
🔍 **Problematic Code:**
```text
// Code location: lib/sinatra/activerecord.rb:45
```

🔧 **Fix Suggestion:**
```javascript
// Wrong language - JavaScript instead of Ruby
function processData() {
  // ...
}
```
```

### Why This Happens:
1. DeepWiki doesn't provide the actual file content
2. Our extractor can't find the file (doesn't exist or wrong path)
3. Falls back to placeholder text
4. Fix templates default to JavaScript

---

## Recommendations

### Immediate Actions:

1. **Improve DeepWiki Parser**
   - Better extraction of file paths from text
   - Fuzzy matching for file names
   - Handle conversational responses

2. **Add Validation Layer**
   - Check if files exist before extraction
   - Validate line numbers are in range
   - Skip non-existent files gracefully

3. **Enhance Fallback Strategy**
   - When file not found, search repository
   - Use grep/ripgrep to find similar code
   - Generate language-appropriate placeholders

### Long-term Solutions:

1. **Fix DeepWiki API**
   - Return structured JSON responses
   - Include actual code snippets
   - Provide full file paths from repo root
   - Add severity and category metadata

2. **Alternative Analysis**
   - Use other static analysis tools (ESLint, RuboCop, etc.)
   - Combine multiple sources
   - Build our own AST-based analyzer

3. **Better Mocking**
   - Create realistic mocks based on actual repos
   - Use real file structures
   - Generate plausible issues for each language

---

## Test Results

### Ruby Repository Test (sinatra/sinatra):
- **Files that don't exist:** 6 out of 10 referenced files
- **Code extracted:** 4 out of 10 issues
- **Report quality:** 100% (but with placeholders)

### File Existence Check:
```
✅ lib/sinatra.rb
✅ lib/sinatra/base.rb
❌ lib/sinatra/activerecord.rb (separate gem, not in repo)
❌ lib/sinatra/template.rb
❌ lib/sinatra/middleware.rb
❌ lib/sinatra/file_upload.rb
❌ Gemfile.lock
❌ config.ru
```

---

## Conclusion

The fundamental issue is that **DeepWiki is not providing the structured data we need** for quality analysis reports. Our code is working correctly within its constraints, but it cannot create quality output from poor quality input.

**The saying applies: "Garbage In, Garbage Out"**

To fix this, we need to either:
1. Get DeepWiki to return better structured data
2. Build a more intelligent parser that can handle conversational text
3. Use alternative analysis tools that provide structured output

---

*Report generated: 2025-08-27 19:50 UTC*