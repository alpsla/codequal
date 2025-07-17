# Implementation Status: PR Issue Tracking

## What's Currently Implemented ✅

### 1. Issue Resolution Detection (Post-Analysis)
Location: `packages/agents/src/services/issue-resolution-detector.ts`

The system can detect fixed/new/unchanged issues **AFTER** analysis by comparing:
- PR analysis results
- Existing repository issues (from DeepWiki/Vector DB)

```typescript
const { fixedIssues, newIssues, unchangedIssues } = issueResolutionDetector.detectFixedIssues(
  prAnalysisResults,
  existingRepoIssues,
  repositoryUrl,
  prNumber
);
```

This works by:
1. Generating unique IDs for issues based on type/file/line
2. Comparing issue IDs between repo and PR
3. Categorizing as fixed (in repo but not PR), new (in PR but not repo), or unchanged

### 2. Skill Tracking Integration
The detected issue resolutions are used for skill tracking:
- Fixed issues → skill points awarded
- Unchanged issues → skill degradation applied

## What's NOT Implemented ❌

### 1. Line-Level PR Diff Awareness in Tools

MCP tools currently:
- Analyze files and report ALL issues found
- Include line numbers for each issue
- But do NOT know which lines were changed by the PR

Missing functionality:
```typescript
// This is what we described but NOT implemented:
interface ToolFinding {
  line: number;
  message: string;
  isNewInPR: boolean;      // ❌ NOT implemented
  existedBefore: boolean;   // ❌ NOT implemented  
  inChangedLines: boolean;  // ❌ NOT implemented
}
```

### 2. Diff-Aware Analysis

Tools don't currently:
- Parse PR diffs to identify changed line ranges
- Cross-reference findings with diff line numbers
- Mark issues as new vs existing based on PR changes

## Why This Gap Exists

1. **MCP Tools Run on Full Files**: They analyze complete file content, not diffs
2. **No Diff Context Passed**: Tools don't receive information about which lines changed
3. **Post-Processing Only**: Issue categorization happens after analysis, not during

## What Would Be Needed

To implement true diff-aware analysis:

### 1. Pass Diff Context to Tools
```typescript
interface EnhancedPRFile {
  path: string;
  content: string;
  diff: string;
  changedLineRanges: Array<{
    start: number;
    end: number;
    type: 'added' | 'modified' | 'deleted';
  }>;
}
```

### 2. Enhance Tool Findings
```typescript
class EnhancedMCPAdapter {
  async analyze(context) {
    const findings = await this.runTool(context.files);
    
    // Mark findings based on PR changes
    return findings.map(finding => ({
      ...finding,
      isNewInPR: this.isInChangedLines(finding.line, context.changedLineRanges),
      existedBefore: !this.isInChangedLines(finding.line, context.changedLineRanges)
    }));
  }
}
```

### 3. Parse Diffs for Line Ranges
```typescript
function parseGitDiff(patch: string): ChangedLineRange[] {
  // Parse @@ -start,count +start,count @@ headers
  // Track which lines are additions/modifications
  // Return ranges of changed lines
}
```

## Current Workaround

The system achieves similar results through:
1. **DeepWiki**: Provides repository-wide analysis (all existing issues)
2. **Issue Resolution Detector**: Compares before/after at issue level
3. **Agent Intelligence**: Makes recommendations based on full context

## Recommendation

The current approach works but could be enhanced by:
1. Implementing diff parsing to extract changed line ranges
2. Passing this context to MCP tools
3. Enhancing tool adapters to mark findings as new/existing
4. Providing richer data for agents to make better decisions

This would enable more precise analysis and better PR feedback, showing exactly which issues are new vs pre-existing.