# Analysis Modes - User-Selectable Depth/Time Tradeoff

## Overview

CodeQual offers 4 analysis modes that let users choose their preferred depth of analysis based on time budget and priorities. This feature is designed to be easily exposed through the API and Website UI.

## Available Modes

### 🚀 **Fast** Mode (~2 minutes)
**Tools**: PMD + Semgrep  
**Use Case**: Quick security & critical issue check before commit  
**Best For**: Developers who want immediate feedback on critical/high severity issues only

```typescript
orchestrator.orchestrate(repoPath, 'pr', undefined, { analysisMode: 'fast' });
```

---

### ⭐ **Standard** Mode (~4 minutes) ✅ RECOMMENDED (DEFAULT)
**Tools**: PMD + Semgrep + Dependency-Check  
**Use Case**: Comprehensive security analysis including CVE scanning  
**Best For**: Most PR reviews and CI/CD pipelines

```typescript
// Default mode - no need to specify
orchestrator.orchestrate(repoPath, 'pr');

// Explicit:
orchestrator.orchestrate(repoPath, 'pr', undefined, { analysisMode: 'standard' });
```

---

### 📋 **Thorough** Mode (~6 minutes)
**Tools**: PMD + Semgrep + Dependency-Check + Checkstyle  
**Use Case**: Security + Style compliance  
**Best For**: Teams that enforce strict code style guidelines

```typescript
orchestrator.orchestrate(repoPath, 'pr', undefined, { analysisMode: 'thorough' });
```

---

### 🔬 **Complete** Mode (~15 minutes)
**Tools**: PMD + Semgrep + Dependency-Check + Checkstyle + SpotBugs  
**Use Case**: Most comprehensive analysis with compilation  
**Best For**: Pre-release validation, security audits, major PR reviews

```typescript
orchestrator.orchestrate(repoPath, 'pr', undefined, { analysisMode: 'complete' });
```

---

## API Integration Examples

### 1. Get Available Modes (for UI dropdown)

```typescript
import { getAvailableAnalysisModes } from './java-tool-orchestrator';

// Express API endpoint
app.get('/api/analysis-modes', (req, res) => {
  const modes = getAvailableAnalysisModes();
  res.json(modes);
});

// Response:
// [
//   {
//     mode: 'fast',
//     description: 'Critical & High security issues only (fastest)',
//     estimatedTime: '~2 minutes',
//     tools: { pmd: true, semgrep: true, dependencyCheck: false, ... },
//     includeStyleIssues: false,
//     includeCompilation: false
//   },
//   ...
// ]
```

### 2. Validate User Selection

```typescript
import { getAnalysisModeConfig } from './java-tool-orchestrator';

app.post('/api/analyze', async (req, res) => {
  const { repoUrl, prNumber, analysisMode } = req.body;
  
  // Validate mode
  const modeConfig = getAnalysisModeConfig(analysisMode);
  if (!modeConfig) {
    return res.status(400).json({ 
      error: 'Invalid analysis mode',
      validModes: ['fast', 'standard', 'thorough', 'complete']
    });
  }
  
  // Run analysis with user-selected mode
  const result = await orchestrator.orchestrate(repoPath, 'pr', undefined, {
    analysisMode: analysisMode as AnalysisMode
  });
  
  res.json({ result, mode: modeConfig });
});
```

### 3. Website UI Example (React)

```typescript
import { useState, useEffect } from 'react';

function AnalysisForm() {
  const [modes, setModes] = useState([]);
  const [selectedMode, setSelectedMode] = useState('standard');

  useEffect(() => {
    // Fetch available modes from API
    fetch('/api/analysis-modes')
      .then(res => res.json())
      .then(setModes);
  }, []);

  return (
    <div>
      <h3>Select Analysis Depth</h3>
      {modes.map(mode => (
        <div key={mode.mode}>
          <input
            type="radio"
            name="analysisMode"
            value={mode.mode}
            checked={selectedMode === mode.mode}
            onChange={(e) => setSelectedMode(e.target.value)}
          />
          <label>
            <strong>{mode.mode.toUpperCase()}</strong> - {mode.description}
            <br />
            <small>⏱️  {mode.estimatedTime}</small>
            <br />
            <small>🔧 Tools: {Object.entries(mode.tools)
              .filter(([_, enabled]) => enabled)
              .map(([tool]) => tool)
              .join(', ')}</small>
          </label>
        </div>
      ))}
    </div>
  );
}
```

---

## Mode Comparison Table

| Feature | Fast | Standard ✅ | Thorough | Complete |
|---------|------|----------|----------|----------|
| **Time** | ~2 min | ~4 min | ~6 min | ~15 min |
| **PMD** | ✅ | ✅ | ✅ | ✅ |
| **Semgrep** | ✅ | ✅ | ✅ | ✅ |
| **Dependency-Check** | ❌ | ✅ | ✅ | ✅ |
| **Checkstyle** | ❌ | ❌ | ✅ | ✅ |
| **SpotBugs** | ❌ | ❌ | ❌ | ✅ |
| **CVE Scanning** | ❌ | ✅ | ✅ | ✅ |
| **Style Issues** | ❌ | ❌ | ✅ | ✅ |
| **Requires Compilation** | ❌ | ❌ | ❌ | ✅ |

---

## Implementation Details

### Tool Enablement Logic

The orchestrator respects both the tool configuration AND the analysis mode:

```typescript
// Tool runs ONLY if:
// 1. Tool is enabled in config (checkstyle.enabled = true)
// 2. Tool is enabled in selected mode (ANALYSIS_MODES[mode].tools.checkstyle = true)

if (this.config.checkstyle.enabled && modeConfig.tools.checkstyle) {
  // Run Checkstyle
}
```

### Smart Skip Logic

Even in 'thorough' or 'complete' modes, Checkstyle can still be skipped if:
- Critical/high security issues are found (optimization)
- This behavior can be overridden with `includeAllSeverities: true`

---

## User Communication

### Recommended UI Copy

**Fast Mode**:
> "Get results in 2 minutes. Focuses on critical security issues only. Perfect for quick pre-commit checks."

**Standard Mode** (Default):
> "Recommended for most PRs. Includes security analysis and CVE scanning. Takes about 4 minutes."

**Thorough Mode**:
> "Comprehensive analysis including code style checks. Takes about 6 minutes. Best for teams with strict style guidelines."

**Complete Mode**:
> "Most thorough analysis with compilation and bug detection. Takes about 15 minutes. Ideal for release candidates and security audits."

---

## Future Enhancements

1. **Custom Modes**: Allow users to create custom tool combinations
2. **Time Budgets**: "I have 5 minutes" → auto-select best mode
3. **Historical Data**: Show actual average times for user's repositories
4. **Cost Awareness**: Show AI cost breakdown per mode
5. **Incremental Modes**: "Run fast first, upgrade to thorough if issues found"

---

## Testing

```typescript
import { getAvailableAnalysisModes, getAnalysisModeConfig } from './java-tool-orchestrator';

// Test: Get all modes
const modes = getAvailableAnalysisModes();
console.log(`${modes.length} modes available`); // 4

// Test: Get specific mode
const thorough = getAnalysisModeConfig('thorough');
console.log(thorough.tools.checkstyle); // true
console.log(thorough.tools.spotbugs); // false

// Test: Invalid mode
const invalid = getAnalysisModeConfig('ultrafast');
console.log(invalid); // undefined
```

---

**Last Updated**: October 12, 2025  
**Status**: ✅ Production Ready  
**API Version**: v1.0

