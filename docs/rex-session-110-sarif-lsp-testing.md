# Session 110: SARIF/LSP Export Testing in Real IDEs

**Goal**: Test that SARIF and LSP exports actually work in VS Code and other IDEs. Verify that exported data helps users fix issues.

**Prerequisites**:
- Session 108 complete (patterns fixed)
- Session 109 complete (data audit done)
- VS Code installed with SARIF Viewer extension
- Test repository with known issues

---

## Tasks

### 1. Install Required VS Code Extensions
**Goal**: Set up VS Code for SARIF testing
**Steps**:
1. Install "SARIF Viewer" extension by Microsoft
2. Install "Error Lens" extension for inline diagnostics
3. Install "GitLab Workflow" extension (if testing GitLab format)
4. Restart VS Code
**Commands**:
```bash
code --install-extension MS-SarifVSCode.sarif-viewer
code --install-extension usernamehw.errorlens
code --install-extension GitLab.gitlab-workflow
```

---

### 2. Generate SARIF Export from V9 Analysis
**Goal**: Create a SARIF 2.1.0 file from V9 analysis
**Steps**:
1. Run V9 analysis on test repository
2. Export results to SARIF format
3. Save to test-output.sarif
4. Verify SARIF schema compliance
**Commands**:
```bash
cd packages/agents

# Run analysis and export SARIF
npx ts-node -e "
import { V9PRAnalyzer } from './src/two-branch/services/v9-pr-analyzer';
import { SARIFConverter } from './src/two-branch/tools/cloud-api/sarif-converter';
import * as fs from 'fs';

async function exportSARIF() {
  const analyzer = new V9PRAnalyzer();
  const result = await analyzer.analyzePR({
    repositoryUrl: 'https://github.com/spring-projects/spring-petclinic.git',
    prNumber: 950,
    language: 'java',
    analysisMode: 'complete'
  });

  // Convert to SARIF
  const sarif = SARIFConverter.convert(result.issues.all);
  fs.writeFileSync('/tmp/codequal-test.sarif', JSON.stringify(sarif, null, 2));
  console.log('SARIF exported to /tmp/codequal-test.sarif');
  console.log('Issues exported:', result.issues.all.length);
}

exportSARIF();
"
```
**Files**:
- `/tmp/codequal-test.sarif` - Generated SARIF file

---

### 3. Validate SARIF Schema
**Goal**: Ensure SARIF file is valid 2.1.0 format
**Steps**:
1. Validate against SARIF 2.1.0 JSON schema
2. Check required fields exist
3. Fix any schema violations
**Required SARIF Structure**:
```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [{
    "tool": {
      "driver": {
        "name": "CodeQual",
        "version": "1.0.0",
        "informationUri": "https://codequal.dev",
        "rules": [
          {
            "id": "rule-id",
            "name": "Rule Name",
            "shortDescription": { "text": "Short description" },
            "fullDescription": { "text": "Full description" },
            "helpUri": "https://docs.example.com/rule",
            "defaultConfiguration": { "level": "warning" }
          }
        ]
      }
    },
    "results": [
      {
        "ruleId": "rule-id",
        "level": "warning",
        "message": { "text": "Issue message" },
        "locations": [{
          "physicalLocation": {
            "artifactLocation": { "uri": "src/file.java" },
            "region": {
              "startLine": 10,
              "startColumn": 5,
              "endLine": 10,
              "endColumn": 25
            }
          }
        }],
        "fixes": [{
          "description": { "text": "Apply this fix" },
          "artifactChanges": [{
            "artifactLocation": { "uri": "src/file.java" },
            "replacements": [{
              "deletedRegion": {
                "startLine": 10,
                "startColumn": 5,
                "endLine": 10,
                "endColumn": 25
              },
              "insertedContent": { "text": "fixed code here" }
            }]
          }]
        }]
      }
    ]
  }]
}
```
**Validation Commands**:
```bash
# Install SARIF validator
npm install -g @microsoft/sarif-multitool

# Validate SARIF file
sarif validate /tmp/codequal-test.sarif
```

---

### 4. Test SARIF Import in VS Code
**Goal**: Verify issues appear correctly in VS Code
**Steps**:
1. Open test repository in VS Code
2. Open SARIF Viewer panel (Ctrl+Shift+P → "SARIF: Open Panel")
3. Load the generated SARIF file
4. Verify issues appear in Problems panel
5. Click on issue → verify it navigates to correct file/line
6. Check if fix suggestions appear
**Verification Checklist**:
- [ ] SARIF file loads without errors
- [ ] Issues appear in SARIF Viewer panel
- [ ] Issue count matches expected
- [ ] Clicking issue navigates to correct location
- [ ] Issue message is clear and helpful
- [ ] Severity levels display correctly
- [ ] Rule descriptions are available
- [ ] Fix suggestions appear (if available)

---

### 5. Test SARIF Fix Application
**Goal**: Verify fix suggestions can be applied from SARIF
**Steps**:
1. Find an issue with a fix in SARIF Viewer
2. Attempt to apply the fix
3. Verify code changes correctly
4. Check if fix resolves the issue
**Verification Checklist**:
- [ ] Fix suggestions are present in SARIF
- [ ] "Apply Fix" action is available
- [ ] Clicking apply modifies the correct code
- [ ] Applied fix is syntactically correct
- [ ] Applied fix resolves the original issue

---

### 6. Generate GitLab Code Quality Export
**Goal**: Create GitLab Code Quality JSON file
**Steps**:
1. Export V9 results to GitLab Code Quality format
2. Save to gl-code-quality-report.json
3. Verify format compliance
**Commands**:
```bash
cd packages/agents

npx ts-node -e "
import { V9PRAnalyzer } from './src/two-branch/services/v9-pr-analyzer';
import * as fs from 'fs';

async function exportGitLab() {
  const analyzer = new V9PRAnalyzer();
  const result = await analyzer.analyzePR({
    repositoryUrl: 'https://github.com/spring-projects/spring-petclinic.git',
    prNumber: 950,
    language: 'java'
  });

  // Convert to GitLab Code Quality format
  const gitlabFormat = result.issues.all.map(issue => ({
    description: issue.message,
    check_name: issue.ruleId,
    fingerprint: issue.id,
    severity: mapSeverity(issue.severity),
    location: {
      path: issue.file,
      lines: {
        begin: issue.line
      }
    }
  }));

  fs.writeFileSync('/tmp/gl-code-quality-report.json', JSON.stringify(gitlabFormat, null, 2));
  console.log('GitLab format exported to /tmp/gl-code-quality-report.json');
}

function mapSeverity(severity: string): string {
  const map = { critical: 'blocker', high: 'critical', medium: 'major', low: 'minor', info: 'info' };
  return map[severity] || 'info';
}

exportGitLab();
"
```
**GitLab Code Quality Schema**:
```json
[
  {
    "description": "Issue description",
    "check_name": "rule-id",
    "fingerprint": "unique-hash",
    "severity": "major",
    "location": {
      "path": "src/file.java",
      "lines": {
        "begin": 10
      }
    }
  }
]
```

---

### 7. Test GitLab Code Quality in CI
**Goal**: Verify GitLab displays quality report in MR
**Steps**:
1. Create test GitLab repository (or use existing)
2. Add gl-code-quality-report.json as CI artifact
3. Open Merge Request
4. Verify Code Quality widget appears
5. Verify issues display correctly
**GitLab CI Configuration**:
```yaml
code_quality:
  stage: test
  script:
    - npm run analyze -- --format gitlab > gl-code-quality-report.json
  artifacts:
    reports:
      codequality: gl-code-quality-report.json
```
**Verification Checklist**:
- [ ] Code Quality artifact uploads successfully
- [ ] MR shows Code Quality widget
- [ ] Issues display with correct severity
- [ ] Clicking issue shows location
- [ ] New issues vs existing issues distinguished

---

### 8. Test LSP Diagnostics Integration
**Goal**: Test Language Server Protocol diagnostic publishing
**Steps**:
1. Check if LSP diagnostic format exists
2. Test with VS Code language server
3. Verify inline error display
**LSP Diagnostic Format**:
```typescript
interface Diagnostic {
  range: {
    start: { line: number; character: number; };
    end: { line: number; character: number; };
  };
  message: string;
  severity: 1 | 2 | 3 | 4;  // Error, Warning, Info, Hint
  code?: string | number;
  source?: string;
  relatedInformation?: DiagnosticRelatedInformation[];
}
```
**Steps**:
1. Convert V9 issues to LSP Diagnostic format
2. Verify format is correct
3. Test with VS Code's diagnostic collection API

---

### 9. Document Export Issues Found
**Goal**: Create report of all issues found during testing
**Steps**:
1. List all SARIF issues encountered
2. List all GitLab format issues
3. List all LSP issues
4. Create action items for fixes
**Output File**: `docs/EXPORT_FORMAT_ISSUES.md`

**Report Template**:
```markdown
# Export Format Issues Report

## SARIF 2.1.0
### Working
- [ ] Basic structure valid
- [ ] Issues display in VS Code
- [ ] Navigation works

### Issues Found
| Issue | Description | Fix Required |
|-------|-------------|--------------|

## GitLab Code Quality
### Working
- [ ] Format valid
- [ ] Displays in MR widget

### Issues Found
| Issue | Description | Fix Required |
|-------|-------------|--------------|

## LSP Diagnostics
### Working
- [ ] Format valid
- [ ] Inline display works

### Issues Found
| Issue | Description | Fix Required |
|-------|-------------|--------------|

## Action Items
1. [ ] ...
```

---

### 10. Test Fix Application End-to-End
**Goal**: Verify complete flow from export to fix
**Steps**:
1. Export SARIF with fixes
2. Import in VS Code
3. Apply suggested fix
4. Run linter to verify fix works
5. Document success/failure rate
**Verification Checklist**:
- [ ] SARIF includes fix suggestions
- [ ] Fixes are syntactically valid
- [ ] Applied fixes resolve the issues
- [ ] No regressions introduced
- [ ] User can understand what changed

---

## Validation

```bash
# Validate SARIF
sarif validate /tmp/codequal-test.sarif

# Check SARIF structure
cat /tmp/codequal-test.sarif | jq '.runs[0].results | length'

# Check GitLab format
cat /tmp/gl-code-quality-report.json | jq 'length'
```

## Expected Outcomes

- SARIF 2.1.0 export working and valid
- VS Code displays issues correctly with navigation
- Fix suggestions are applicable (where provided)
- GitLab Code Quality format working
- `docs/EXPORT_FORMAT_ISSUES.md` documenting any problems
- Clear understanding of what works vs what needs fixing

## Notes

- SARIF fix suggestions are optional but valuable for BASIC tier
- GitLab format is simpler (no fixes) but must work for MR widget
- LSP is for real-time integration (future feature)
- Focus on SARIF first as it's most important for IDE integration
- Test with multiple issue types (security, quality, formatting)

## Tools Reference

- **SARIF Viewer**: https://marketplace.visualstudio.com/items?itemName=MS-SarifVSCode.sarif-viewer
- **SARIF Schema**: https://github.com/oasis-tcs/sarif-spec
- **GitLab Code Quality**: https://docs.gitlab.com/ee/ci/testing/code_quality.html
- **LSP Specification**: https://microsoft.github.io/language-server-protocol/
