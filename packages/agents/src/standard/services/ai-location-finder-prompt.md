# AI Location Finder - Prompt Design Document

## Overview
The AI Location Finder agent uses LLM capabilities to identify exact code locations for issues reported by DeepWiki, which typically provides only generic descriptions without specific line numbers.

## Core Prompt Structure

### System Role Definition
```
You are an expert code analyzer specializing in identifying exact locations of code issues.
Your expertise spans multiple programming languages and frameworks, with deep understanding of:
- Security vulnerabilities and their typical manifestations
- Performance bottlenecks and inefficient patterns
- Code quality issues and anti-patterns
- Error handling gaps and edge cases
- API design problems and validation issues
```

### Task Description
```
TASK: Analyze the provided code file to identify the exact location where the described issue occurs.

Your analysis should:
1. Consider the entire context of the file
2. Identify ALL potential locations where the issue might manifest
3. Rank locations by likelihood/severity
4. Provide specific line numbers and code snippets
5. Explain WHY each location matches the issue description
```

### Input Format
```
ISSUE DETAILS:
- Type: [Issue category - Security/Performance/Quality/etc.]
- Severity: [Critical/High/Medium/Low]
- Title: [Brief issue description]
- Description: [Detailed explanation of the issue]
- Remediation: [Suggested fix or best practice]

FILE INFORMATION:
- Language: [Programming language]
- Framework: [If applicable]
- File Path: [Relative path in repository]
- File Size: [Lines of code]

CODE CONTENT:
[Full file content with line numbers]
```

## Issue-Specific Analysis Guidelines

### Security Issues

#### Input Validation
```
For "No Input Validation" issues:
1. Identify ALL entry points where external data enters the system:
   - HTTP request handlers (req.body, req.params, req.query)
   - Command-line arguments (process.argv)
   - File uploads and file paths
   - Database queries with user input
   - External API responses
   
2. Look for patterns indicating missing validation:
   - Direct use of user input without checks
   - Missing type validation
   - No length/size limits
   - Missing sanitization for special characters
   - Lack of whitelist validation
   
3. Consider context-specific validation needs:
   - SQL injection risks (string concatenation in queries)
   - XSS risks (unescaped HTML output)
   - Path traversal (file system operations)
   - Command injection (exec/spawn calls)
```

#### Authentication & Authorization
```
For authentication/authorization issues:
1. Identify authentication checkpoints:
   - Route handlers without auth middleware
   - Missing permission checks
   - Hardcoded credentials or tokens
   
2. Look for authorization gaps:
   - Role-based access control failures
   - Missing ownership verification
   - Privilege escalation possibilities
```

### Performance Issues

#### Inefficient Algorithms
```
For performance-related issues:
1. Identify computational bottlenecks:
   - Nested loops with high complexity (O(n²), O(n³))
   - Repeated calculations without memoization
   - Inefficient data structure usage
   
2. Look for I/O bottlenecks:
   - Synchronous operations in async contexts
   - Missing database query optimization
   - Lack of caching for expensive operations
   - Multiple sequential API calls
```

#### Memory Issues
```
For memory-related issues:
1. Identify memory leaks:
   - Event listeners without cleanup
   - Unclosed resources (files, connections)
   - Growing data structures without limits
   
2. Look for inefficient memory usage:
   - Loading entire files into memory
   - Creating unnecessary object copies
   - Missing stream processing for large data
```

### Code Quality Issues

#### Error Handling
```
For error handling issues:
1. Identify unhandled error scenarios:
   - Missing try-catch blocks
   - Unhandled promise rejections
   - Missing error callbacks
   - No validation of external responses
   
2. Look for poor error handling:
   - Generic catch blocks hiding errors
   - Missing error logging
   - No error recovery mechanisms
   - Exposing sensitive error details
```

#### Code Duplication
```
For code duplication issues:
1. Identify repeated patterns:
   - Copy-pasted code blocks
   - Similar function implementations
   - Repeated conditional logic
   
2. Look for refactoring opportunities:
   - Common functionality that could be extracted
   - Repeated configuration or setup code
   - Similar data transformations
```

## Output Format Specification

### Primary Response Structure
```json
{
  "primary_location": {
    "line_start": number,
    "line_end": number,
    "column_start": number,
    "column_end": number,
    "code_snippet": "exact code causing the issue",
    "explanation": "detailed explanation of why this location matches",
    "confidence": 0-100,
    "severity_at_location": "how severe the issue is at this specific location"
  },
  "alternative_locations": [
    {
      "line_start": number,
      "line_end": number,
      "code_snippet": "code",
      "explanation": "why this might also be affected",
      "confidence": 0-100,
      "relationship": "how this relates to primary location"
    }
  ],
  "analysis": {
    "pattern_identified": "description of the problematic pattern",
    "root_cause": "underlying cause of the issue",
    "impact_scope": "what parts of the code are affected",
    "data_flow": "how data flows to/from the issue location"
  },
  "fix_guidance": {
    "location": {
      "line": number,
      "insert_before": boolean,
      "insert_after": boolean
    },
    "approach": "high-level fix strategy",
    "code_changes_needed": "specific changes required",
    "validation_steps": "how to verify the fix"
  }
}
```

### Confidence Scoring Guidelines
```
90-100: Exact match with clear issue manifestation
70-89: High probability match with strong indicators
50-69: Probable match with some uncertainty
30-49: Possible match but needs verification
0-29: Low confidence, speculative match
```

## Multi-Language Support

### Language-Specific Patterns

#### JavaScript/TypeScript
```
Focus areas:
- Async/await error handling
- Type assertions and any types
- Prototype pollution risks
- Event emitter memory leaks
- Module import security
```

#### Python
```
Focus areas:
- Type hints and runtime validation
- SQL injection in string formatting
- Pickle deserialization risks
- Resource management (with statements)
- Global interpreter lock impacts
```

#### Java
```
Focus areas:
- Null pointer exceptions
- Resource try-with-resources
- Thread safety issues
- Reflection security risks
- Spring injection problems
```

#### Go
```
Focus areas:
- Error handling patterns
- Goroutine leaks
- Race conditions
- Defer cleanup patterns
- Interface nil checks
```

## Context Enhancement

### Repository Context
```
When available, consider:
- Project structure and conventions
- Framework-specific patterns
- Team coding standards
- Related files and dependencies
- Test coverage gaps
```

### Historical Context
```
When available, consider:
- Previous issues in the same file
- Recent changes and their impact
- Known problematic areas
- Technical debt locations
```

## Example Prompts

### Example 1: Input Validation Issue
```
ISSUE DETAILS:
- Type: Security
- Severity: High
- Title: No Input Validation
- Description: User input is processed without validation, potentially allowing malicious data

FILE INFORMATION:
- Language: JavaScript
- Framework: Express.js
- File Path: src/api/user.js

CODE CONTENT:
1: const express = require('express');
2: const router = express.Router();
3: const db = require('../database');
4: 
5: router.post('/update', async (req, res) => {
6:   const userId = req.body.userId;
7:   const newEmail = req.body.email;
8:   
9:   await db.query(`UPDATE users SET email = '${newEmail}' WHERE id = ${userId}`);
10:   res.json({ success: true });
11: });

EXPECTED ANALYSIS:
{
  "primary_location": {
    "line_start": 6,
    "line_end": 7,
    "explanation": "Direct use of req.body without validation",
    "confidence": 95
  },
  "alternative_locations": [{
    "line_start": 9,
    "line_end": 9,
    "explanation": "SQL injection vulnerability from unvalidated input",
    "confidence": 100
  }]
}
```

### Example 2: Performance Issue
```
ISSUE DETAILS:
- Type: Performance
- Severity: Medium
- Title: Inefficient Algorithm
- Description: Nested loops causing O(n²) complexity

FILE INFORMATION:
- Language: Python
- File Path: src/analytics/processor.py

CODE CONTENT:
1: def find_duplicates(items):
2:     duplicates = []
3:     for i in range(len(items)):
4:         for j in range(i + 1, len(items)):
5:             if items[i] == items[j]:
6:                 duplicates.append(items[i])
7:     return duplicates

EXPECTED ANALYSIS:
{
  "primary_location": {
    "line_start": 3,
    "line_end": 6,
    "explanation": "Nested loops creating O(n²) time complexity",
    "confidence": 100
  }
}
```

## Prompt Optimization Weights

Based on the role configuration for `location_finder`:
- **Quality Weight: 0.55** - Accuracy in finding correct locations is crucial
- **Cost Weight: 0.25** - Moderate cost sensitivity for volume processing
- **Speed Weight: 0.20** - Reasonable response time for interactive use

These weights suggest:
1. Prioritize accuracy over speed
2. Use comprehensive analysis rather than quick heuristics
3. Include alternative locations to improve hit rate
4. Provide detailed explanations for debugging

## Integration Points

### Input Preprocessing
1. Add line numbers to code content
2. Normalize issue descriptions from DeepWiki format
3. Extract relevant context from repository structure
4. Identify file language and framework

### Output Postprocessing
1. Validate line numbers against file bounds
2. Extract code snippets for matched locations
3. Rank alternatives by confidence
4. Format for integration with existing systems

## Success Metrics

### Accuracy Metrics
- **Primary Location Hit Rate**: >80% exact match
- **Alternative Coverage**: >95% issue found in alternatives
- **False Positive Rate**: <10% incorrect locations

### Performance Metrics
- **Response Time**: <3 seconds per file
- **Token Efficiency**: <4000 tokens per analysis
- **Cost per Issue**: <$0.01 average

## Continuous Improvement

### Feedback Loop
1. Track actual issue locations from fixes
2. Compare with AI predictions
3. Identify pattern mismatches
4. Update prompt guidelines

### Pattern Library
Build a library of:
1. Common issue patterns by language
2. Framework-specific vulnerabilities
3. Company-specific code standards
4. Historical issue locations

## Testing Strategy

### Unit Testing
Test individual issue types:
1. Create sample files with known issues
2. Verify location identification
3. Measure confidence accuracy
4. Validate alternative suggestions

### Integration Testing
Test with real DeepWiki output:
1. Use actual issue descriptions
2. Process real repository files
3. Compare with manual analysis
4. Measure end-to-end accuracy

### Performance Testing
Measure at scale:
1. Process 1000+ issues
2. Track token usage
3. Monitor response times
4. Calculate cost metrics