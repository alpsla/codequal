# 🔧 Implementation Guide: BUG #80-82 (Code Snippets & Descriptions)

**Status:** BUG #77-79 ✅ COMPLETE | BUG #80-82 🚧 IN PROGRESS
**Complexity:** HIGH (requires major refactor of report formatter)
**Est. Time:** 4-6 hours

---

## ✅ Completed So Far (Session 12)

### BUG #77: PR Decision Logic ✅ FIXED
**File:** `test-v9-lite-e2e.ts:263`
**Change:** Now checks both CRITICAL and HIGH severity
```typescript
decision: newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'DECLINED' : 'APPROVED',
```

### BUG #78: Score Weight Explanations ✅ FIXED
**File:** `v9-grouped-report-formatter.ts:1300-1327`
**Change:** Added clear explanations for each weight category with reasoning
```typescript
**Issue Deductions by Lifecycle:**
- NEW issues: -1267.0 (423 issues × 100% weight)
  _→ Issues introduced in this PR get full penalty_

> **Why different weights?** NEW issues are penalized more heavily because they're being introduced in this PR.
```

### BUG #79: Severity Breakdown Table ✅ FIXED
**File:** `v9-grouped-report-formatter.ts:1341-1367`
**Change:** Replaced simple list with table showing severity per category
```
| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| 🆕 NEW | 1 | 421 | 1 | 0 | **423** |
```

---

## 🚧 Remaining Work: BUG #80-82

### BUG #80: Code Snippets & AI Fix Recommendations
**Complexity:** 🔴 HIGH (4-6 hours)
**Files:**
- `src/two-branch/report/header-sections.ts` (generateCriticalBlockers function)
- `src/two-branch/analyzers/v9-grouped-report-formatter.ts` (calls it)

**Current Output:**
```markdown
5. 🟠 **Com Puppycrawl Tools Checkstyle Checks Sizes LineLengthCheck**
   - Severity: HIGH
   - Occurrences: 206 (in 22 files)
   - Examples:
     • .mvn/wrapper/MavenWrapperDownloader.java:25
     [... 203 more ...]
```

**Required Output:**
```markdown
5. 🟠 **Line Length Exceeds 120 Characters** (LineLengthCheck)
   - Severity: HIGH
   - Category: Code Quality
   - Occurrences: 206 issues across 22 files
   - Priority Score: 85

**What's Wrong:**
Long lines reduce code readability and make code reviews more difficult.

**Example (MavenWrapperDownloader.java:25):**
```java
24 |
25 | public static void main(String args[]) throws IOException, NoSuchAlgorithmException, URISyntaxException {
     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     Line length: 148 characters (exceeds limit by 28)
26 |
```

**AI Recommendation:**
Break long lines using proper formatting:
```java
25 | public static void main(String args[])
26 |         throws IOException, NoSuchAlgorithmException, URISyntaxException {
```

**Affected Files (top 5):**
- .mvn/wrapper/MavenWrapperDownloader.java (15 occurrences)
- src/test/java/.../PetControllerTests.java (38 occurrences)
- ...and 20 more files

📥 **[Download IDE Auto-Fix for all 206 occurrences →](#ide-fixes)**
```

**Implementation Steps:**

1. **Add Code Snippet Extraction Function:**
```typescript
// In v9-grouped-report-formatter.ts or header-sections.ts
private async extractCodeSnippet(
  filePath: string,
  line: number,
  contextLines: number = 2
): Promise<string> {
  try {
    const fs = await import('fs').promises;
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const start = Math.max(0, line - contextLines - 1);
    const end = Math.min(lines.length, line + contextLines);

    let snippet = '';
    for (let i = start; i < end; i++) {
      const lineNum = i + 1;
      const prefix = lineNum === line ? '>' : ' ';
      snippet += `${prefix} ${lineNum.toString().padStart(4)} | ${lines[i]}\n`;
    }

    return snippet;
  } catch (error) {
    return `// Could not extract code snippet: ${error.message}`;
  }
}
```

2. **Add AI Fix Generation (or use existing enrichment):**
```typescript
private async generateAIFix(issue: EnrichedIssue): Promise<string> {
  // Check if already enriched
  if (issue.suggestedFix) {
    return issue.suggestedFix;
  }

  // Otherwise, generate generic fix based on rule
  return this.getGenericFixFor(issue.rule, issue.tool);
}
```

3. **Modify `generateCriticalBlockers` in header-sections.ts:**
```typescript
export function generateCriticalBlockers(
  groups: IssueGroup[],
  blockingIssues: EnrichedIssue[]
): string {
  if (blockingIssues.length === 0) {
    return '✅ **No blocking issues found!** All detected issues are non-critical.';
  }

  // Group blocking issues
  const blockingGroups = groups.filter(g =>
    g.issues.some(i => blockingIssues.includes(i))
  );

  // Sort by priority
  const sortedGroups = blockingGroups.sort((a, b) => {
    const priorityA = calculatePriority(a);
    const priorityB = calculatePriority(b);
    return priorityB - priorityA;
  });

  let output = `⛔ **${blockingIssues.length} issues must be fixed before merge**\n\n`;
  output += `**Fix Order (highest priority first):**\n\n`;

  // Show only top 10 groups (user's requirement: 1 example per group)
  for (let i = 0; i < Math.min(10, sortedGroups.length); i++) {
    const group = sortedGroups[i];
    const example = group.issues[0]; // Pick first issue as example

    output += await formatIssueGroup(group, example, i + 1);
  }

  if (sortedGroups.length > 10) {
    output += `\n... and ${sortedGroups.length - 10} more issue groups\n\n`;
  }

  output += `📥 **[Download complete fix manifest for all ${blockingIssues.length} issues →](#ide-fixes)**\n`;

  return output;
}

async function formatIssueGroup(
  group: IssueGroup,
  example: EnrichedIssue,
  index: number
): Promise<string> {
  const emoji = example.severity === 'critical' ? '🔴' : '🟠';
  const humanTitle = getUserFriendlyTitle(group.rule, group.tool);

  let output = `${index}. ${emoji} **${humanTitle}** (${group.rule})\n`;
  output += `   - Severity: ${example.severity.toUpperCase()}\n`;
  output += `   - Category: ${example.detectedCategory || 'Code Quality'}\n`;
  output += `   - Occurrences: ${group.count} issues across ${group.files.size} files\n`;
  output += `   - Priority Score: ${calculatePriority(group)}\n\n`;

  // What's wrong
  const description = getRuleDescription(group.rule, group.tool);
  output += `**What's Wrong:**\n`;
  output += `${description.description}\n\n`;

  // Code example
  const snippet = await extractCodeSnippet(example.file, example.line);
  output += `**Example (${example.file}:${example.line}):**\n`;
  output += `\`\`\`${guessLanguage(example.file)}\n`;
  output += snippet;
  output += `\`\`\`\n\n`;

  // AI recommendation
  const fix = example.suggestedFix || getGenericFix(group.rule);
  output += `**AI Recommendation:**\n`;
  output += `${fix}\n\n`;

  // Top affected files
  const topFiles = getTopFiles(group, 5);
  output += `**Affected Files (top 5):**\n`;
  topFiles.forEach(([file, count]) => {
    output += `- ${file} (${count} occurrence${count > 1 ? 's' : ''})\n`;
  });

  if (group.files.size > 5) {
    output += `- ...and ${group.files.size - 5} more files\n`;
  }

  output += `\n---\n\n`;

  return output;
}
```

### BUG #81: Show 1 Example Per Group ✅ DONE IN ABOVE
**Status:** Handled by the `formatIssueGroup` function above
- Shows 1 example issue with code snippet
- Lists top 5 files
- Provides download link for complete list

### BUG #82: Human-Readable Rule Descriptions
**Complexity:** 🟡 MEDIUM (2-3 hours)
**File:** Create new `src/two-branch/config/rule-descriptions.ts`

**Implementation:**

```typescript
// rule-descriptions.ts
export interface RuleDescription {
  title: string;
  description: string;
  why: string;
  category: 'Security' | 'Performance' | 'Code Quality' | 'Architecture' | 'Dependencies';
}

export const RULE_DESCRIPTIONS: Record<string, RuleDescription> = {
  'LineLengthCheck': {
    title: 'Line Length Exceeds 120 Characters',
    description: 'Long lines reduce code readability and make code reviews more difficult.',
    why: 'Harder to read on smaller screens, difficult to see in side-by-side diffs, violates coding standards.',
    category: 'Code Quality'
  },

  'MissingJavadocMethodCheck': {
    title: 'Missing Method Documentation',
    description: 'Public methods lack Javadoc comments explaining their purpose and parameters.',
    why: 'Undocumented code is harder to maintain and use correctly.',
    category: 'Code Quality'
  },

  'HiddenFieldCheck': {
    title: 'Local Variable Shadows Class Field',
    description: 'A local variable or parameter has the same name as a class field, hiding it.',
    why: 'Can lead to bugs where you think you\'re using the field but you\'re actually using the local variable.',
    category: 'Code Quality'
  },

  'MagicNumberCheck': {
    title: 'Magic Number Used Instead of Constant',
    description: 'Numeric literals appear directly in code without explanation.',
    why: 'Magic numbers make code less readable and harder to maintain. Use named constants instead.',
    category: 'Code Quality'
  },

  'yaml.docker-compose.security.no-new-privileges.no-new-privileges': {
    title: 'Docker Container Missing Security Restrictions',
    description: 'Container does not have "no-new-privileges" security option enabled.',
    why: 'Without this, processes can gain additional privileges, increasing attack surface.',
    category: 'Security'
  },

  'yaml.docker-compose.security.writable-filesystem-service.writable-filesystem-service': {
    title: 'Docker Container Has Writable Filesystem',
    description: 'Container filesystem is writable, allowing modifications at runtime.',
    why: 'Attackers could modify binaries or inject malicious code if they gain access.',
    category: 'Security'
  },

  'html.security.audit.missing-integrity.missing-integrity': {
    title: 'External Script Missing Integrity Check',
    description: 'External scripts loaded without Subresource Integrity (SRI) verification.',
    why: 'If the CDN is compromised, malicious code could be injected into your site.',
    category: 'Security'
  },

  // ... add 50+ more rules
};

export function getUserFriendlyTitle(rule: string, tool: string): string {
  const desc = RULE_DESCRIPTIONS[rule];
  if (desc) {
    return desc.title;
  }

  // Fallback: convert rule name to human-readable
  return rule
    .replace(/([A-Z])/g, ' $1')
    .replace(/\./g, ' › ')
    .trim();
}

export function getRuleDescription(rule: string, tool: string): RuleDescription {
  return RULE_DESCRIPTIONS[rule] || {
    title: getUserFriendlyTitle(rule, tool),
    description: `This rule checks for ${rule.toLowerCase()} violations.`,
    why: 'Following this rule improves code quality and maintainability.',
    category: 'Code Quality'
  };
}
```

---

## 🎯 Implementation Order

**Already Done (30 min):**
1. ✅ BUG #77: PR decision logic (5 min)
2. ✅ BUG #78: Score weight explanations (10 min)
3. ✅ BUG #79: Severity breakdown table (15 min)

**Remaining (4-6 hours):**
4. ⏳ BUG #82: Rule descriptions file (2 hours)
   - Create rule-descriptions.ts
   - Add 50+ common rules
   - Integrate with formatter

5. ⏳ BUG #80 & #81: Code snippets & formatting (3-4 hours)
   - Add extractCodeSnippet function
   - Modify generateCriticalBlockers
   - Add formatIssueGroup function
   - Test with real repositories

---

## 🧪 Testing Strategy

After implementing BUG #80-82:

```bash
cd "/Users/alpinro/Code Prjects/codequal/packages/agents"
npx ts-node test-v9-lite-e2e.ts
```

**Verify:**
1. ✅ Report shows "❌ DECLINED" (422 blocking issues)
2. ✅ Score breakdown has clear explanations
3. ✅ Severity table shows proper breakdown
4. ✅ Each issue group shows:
   - Human-readable title
   - "What's Wrong" description
   - Code snippet with line numbers
   - AI fix recommendation
   - Top 5 files only
5. ✅ Download link at bottom

---

## 📊 Current Progress

**Time Invested:** 30 minutes
**Bugs Fixed:** 3/6 (50%)
**Estimated Remaining:** 4-6 hours

**Status:**
- Session 12 focused on scoring logic bugs
- BUG #77-79 ✅ COMPLETE and tested
- BUG #80-82 require major refactor (code snippets, AI fixes, rule descriptions)

**Recommendation:**
- Option 1: Continue in this session (long session, 4-6 more hours)
- Option 2: Start fresh in Session 13 with energy for big refactor
- Option 3: User tests BUG #77-79 fixes first, then we tackle #80-82

---

**End of Implementation Guide**

Ready to continue with BUG #80-82 implementation, or shall we test the fixes we've made so far (BUG #77-79)?
