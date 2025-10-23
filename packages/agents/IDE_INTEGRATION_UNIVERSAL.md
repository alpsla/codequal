# Universal IDE Integration Format

## 🎯 Goal: One Format for All IDEs

Support **Cursor, VS Code, IntelliJ IDEA, and Windsurf** with a single, universal format.

---

## 📋 Industry Standard Formats

### 1. **SARIF (Static Analysis Results Interchange Format)** ⭐ RECOMMENDED

**Status**: ISO/IEC standard, Microsoft-backed  
**Supported by**: VS Code, GitHub, Azure DevOps, many security tools  
**Format**: JSON

**Advantages**:
- ✅ Industry standard (ISO/IEC 30134-SARIF)
- ✅ Rich metadata support
- ✅ Code fixes (replacements)
- ✅ Multi-tool aggregation
- ✅ VS Code native support via SARIF Viewer extension
- ✅ GitHub Code Scanning integration

**Schema**:
```json
{
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [{
    "tool": {
      "driver": {
        "name": "CodeQual",
        "version": "9.0.0",
        "informationUri": "https://codequal.com"
      }
    },
    "results": [{
      "ruleId": "AvoidThrowingRawExceptionTypes",
      "level": "error",
      "message": {
        "text": "Avoid throwing raw exception types"
      },
      "locations": [{
        "physicalLocation": {
          "artifactLocation": {
            "uri": "src/Main.java"
          },
          "region": {
            "startLine": 136,
            "startColumn": 27,
            "snippet": {
              "text": "throw new RuntimeException();"
            }
          }
        }
      }],
      "fixes": [{
        "description": {
          "text": "Replace with specific exception"
        },
        "artifactChanges": [{
          "artifactLocation": {
            "uri": "src/Main.java"
          },
          "replacements": [{
            "deletedRegion": {
              "startLine": 136,
              "startColumn": 27,
              "endLine": 136,
              "endColumn": 56
            },
            "insertedContent": {
              "text": "throw new IllegalArgumentException(\"Invalid input\");"
            }
          }]
        }]
      }]
    }]
  }]
}
```

---

### 2. **LSP Diagnostics Format** (Language Server Protocol)

**Status**: Open standard  
**Supported by**: All modern IDEs (VS Code, IntelliJ, Cursor, Windsurf)  
**Format**: JSON

**Advantages**:
- ✅ Universal support (all IDEs use LSP)
- ✅ Real-time integration
- ✅ Simple format
- ✅ Native to editor experience

**Schema**:
```json
{
  "uri": "file:///path/to/file.java",
  "diagnostics": [{
    "range": {
      "start": { "line": 135, "character": 26 },
      "end": { "line": 135, "character": 55 }
    },
    "severity": 1,
    "code": "AvoidThrowingRawExceptionTypes",
    "source": "PMD",
    "message": "Avoid throwing raw exception types. Use specific exceptions.",
    "relatedInformation": [{
      "location": {
        "uri": "file:///path/to/file.java",
        "range": {
          "start": { "line": 135, "character": 26 },
          "end": { "line": 135, "character": 55 }
        }
      },
      "message": "Fix: throw new IllegalArgumentException(...)"
    }],
    "codeActions": [{
      "title": "Replace with IllegalArgumentException",
      "kind": "quickfix",
      "edit": {
        "changes": {
          "file:///path/to/file.java": [{
            "range": {
              "start": { "line": 135, "character": 26 },
              "end": { "line": 135, "character": 55 }
            },
            "newText": "throw new IllegalArgumentException(\"Invalid input\")"
          }]
        }
      }
    }]
  }]
}
```

---

### 3. **Generic JSON Format** (Our Current Approach - KEEP AS FALLBACK)

**Advantages**:
- ✅ Simple to generate
- ✅ Easy to parse
- ✅ Flexible structure
- ✅ Works with custom IDE plugins

**Current Schema** (CodeQual V9):
```json
{
  "version": "1.0",
  "group_id": "avoidthrowingrawexceptiontypes-medium-pmd",
  "rule": "AvoidThrowingRawExceptionTypes",
  "severity": "medium",
  "tool": "PMD",
  "description": "Avoid throwing raw exception types",
  "fix_pattern": {
    "type": "regex",
    "find_regex": "throw new (RuntimeException|Exception)\\(\\)",
    "replace_template": "throw new IllegalArgumentException($1)",
    "example": {
      "before": "throw new RuntimeException();",
      "after": "throw new IllegalArgumentException(\"message\");"
    },
    "instructions": "Replace generic exceptions with specific ones"
  },
  "locations": [{
    "file": "src/Main.java",
    "line": 136,
    "column": 27,
    "snippet": "throw new RuntimeException();",
    "category": "NEW"
  }],
  "metadata": {
    "total_occurrences": 5582,
    "confidence": "high",
    "safe_auto_apply": false,
    "estimated_time_seconds": 2791
  }
}
```

---

## 🏆 RECOMMENDATION: Multi-Format Output

**Generate ALL THREE formats** to maximize compatibility:

### Output Structure:
```
/tmp/v9-reports/
├── v9-grouped-report-{timestamp}.md        # Main report (human-readable)
├── issue-groups-map.json                   # Index
├── attachments/                             # Our format (detailed)
│   ├── group-{id}-locations.json
│   └── group-{id}-cursor-fix.json
├── sarif/                                   # SARIF format (VS Code, GitHub)
│   └── codequal-results.sarif
└── lsp/                                     # LSP format (all IDEs)
    └── diagnostics.json
```

---

## 📊 IDE Integration Matrix

| IDE | SARIF | LSP | Custom | Recommended Format |
|-----|-------|-----|--------|-------------------|
| **VS Code** | ✅ Native (SARIF Viewer) | ✅ LSP | ✅ Extensions | **SARIF** (native) |
| **Cursor** | ✅ Fork of VS Code | ✅ LSP | ✅ AI integration | **LSP** + Custom |
| **IntelliJ IDEA** | ⚠️ Plugin required | ✅ LSP | ✅ Inspections API | **LSP** + Custom |
| **Windsurf** | ✅ (likely VS Code-based) | ✅ LSP | ✅ Unknown | **LSP** + SARIF |

---

## 🛠️ Implementation Plan

### Phase 1: Add SARIF Export (HIGH PRIORITY)
```typescript
// packages/agents/src/two-branch/exporters/sarif-exporter.ts
export class SARIFExporter {
  export(issues: EnrichedIssue[], metadata: any): SARIFReport {
    return {
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [{
        tool: {
          driver: {
            name: "CodeQual V9",
            version: metadata.analyzerVersion,
            informationUri: "https://codequal.com"
          }
        },
        results: issues.map(issue => this.convertToSARIFResult(issue))
      }]
    };
  }
}
```

### Phase 2: Add LSP Diagnostics Export
```typescript
// packages/agents/src/two-branch/exporters/lsp-exporter.ts
export class LSPExporter {
  export(issues: EnrichedIssue[]): LSPDiagnostics {
    const diagnosticsByFile = groupBy(issues, 'file');
    
    return Object.entries(diagnosticsByFile).map(([file, issues]) => ({
      uri: `file://${file}`,
      diagnostics: issues.map(issue => this.convertToLSPDiagnostic(issue))
    }));
  }
}
```

### Phase 3: Update Report Generator
```typescript
// packages/agents/test-v9-e2e-complete.ts

// Generate ALL formats
const sarifExporter = new SARIFExporter();
const lspExporter = new LSPExporter();

// Export SARIF (VS Code, GitHub)
const sarifReport = sarifExporter.export(categorizedIssues, metadata);
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'sarif', 'codequal-results.sarif'),
  JSON.stringify(sarifReport, null, 2)
);

// Export LSP (all IDEs)
const lspDiagnostics = lspExporter.export(categorizedIssues);
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'lsp', 'diagnostics.json'),
  JSON.stringify(lspDiagnostics, null, 2)
);

// Keep existing custom format (detailed data)
// ... existing attachment generation ...
```

---

## 🎯 Benefits of Multi-Format Approach

1. **Maximum Compatibility**: Works with ALL IDEs out-of-the-box
2. **Future-Proof**: Standards-compliant formats won't break
3. **Rich Integration**: Each IDE can use the format that works best for it
4. **GitHub Integration**: SARIF enables GitHub Code Scanning
5. **CI/CD Ready**: Standard formats work with most CI/CD tools

---

## 📝 Next Steps

1. ✅ **Bug #24 Fixed**: Code snippets now extracted
2. ⏳ **Next**: Implement SARIF exporter (2-3 hours)
3. ⏳ **Then**: Implement LSP exporter (1-2 hours)
4. ⏳ **Test**: Verify in VS Code, Cursor, IntelliJ
5. ⏳ **Document**: Create integration guides for each IDE

---

## 📚 References

- **SARIF Spec**: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
- **LSP Diagnostics**: https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic
- **VS Code SARIF**: https://marketplace.visualstudio.com/items?itemName=MS-SarifVSCode.sarif-viewer
- **GitHub Code Scanning**: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning

---

**Status**: ✅ Research complete, ready to implement  
**Priority**: HIGH (enables universal IDE integration)  
**Estimated Time**: 4-6 hours for complete implementation

