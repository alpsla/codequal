# Test Commands for V7 Report Enhancement
**Created**: 2025-08-19  
**Purpose**: Preserve test commands and validation steps for continuing V7 report enhancement

## 🧪 Test Files Created This Session

### 1. test-enhanced-report.ts
**Purpose**: Validate all 6 restored features in V7 HTML report
**Location**: `/packages/agents/test-enhanced-report.ts`

```bash
# Run the enhanced report test
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npm run build
node test-enhanced-report.ts

# This test validates:
# - Architecture ASCII diagram
# - Issue descriptions and impacts
# - Code snippets and fix suggestions
# - Educational insights connected to issues
# - Business impact with estimates
# - PR comment section
```

### 2. test-real-pr700-correct.ts
**Purpose**: Test with real PR #700 data (7 new, 8 resolved, 6 pre-existing issues)
**Location**: `/packages/agents/test-real-pr700-correct.ts`

```bash
# Run with mock data (faster)
USE_DEEPWIKI_MOCK=true node test-real-pr700-correct.ts

# Run with real DeepWiki (requires port-forward)
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001 &
USE_DEEPWIKI_MOCK=false node test-real-pr700-correct.ts
```

## 🔍 Validation Commands Used

### Check for Undefined Values
```bash
# Check if any undefined values in report
grep -i "undefined" enhanced-report-test.html
# Expected: 0 matches (all fixed)
```

### Verify Feature Presence
```bash
# Architecture diagram
grep -A 5 "architecture-diagram" enhanced-report-test.html

# Code snippets (BUG-3 - needs verification)
grep -A 2 "Problematic Code:" enhanced-report-test.html
grep -A 2 "Suggested Fix:" enhanced-report-test.html

# Issue impacts
grep -A 2 "Impact:" enhanced-report-test.html

# Educational insights
grep "Learning Opportunities" enhanced-report-test.html

# Business impact
grep "Potential Revenue Loss" enhanced-report-test.html
grep "User Impact" enhanced-report-test.html

# PR comment section
grep "PR Comment for GitHub" enhanced-report-test.html
```

## 📊 Mock Data Structure for Testing

### Issue with Full Details (for testing all features)
```typescript
{
  id: 'issue-1',
  message: 'SQL Injection vulnerability in user input handling',
  title: 'SQL Injection Risk',  // Optional, falls back to message
  description: 'Direct SQL queries using unsanitized user input',
  severity: 'critical',
  category: 'security',
  location: { 
    file: 'src/database/queries.js', 
    line: 145,
    column: 12  // Optional
  },
  codeSnippet: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
  suggestedFix: 'Use parameterized queries or prepared statements',
  remediation: 'Replace with: const query = "SELECT * FROM users WHERE id = ?";',
  impact: 'Critical - Can lead to complete database compromise'
}
```

## 🚀 Quick Test Sequence for Next Session

### Step 1: Verify BUG-3 (Code Snippets) - Already Fixed?
```bash
# Build and test
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npm run build
node test-enhanced-report.ts

# Check if code snippets are present
grep -c "Problematic Code:" enhanced-report-test.html
# Expected: Multiple matches (one per issue)

grep -c "Suggested Fix:" enhanced-report-test.html
# Expected: Multiple matches (one per issue)
```

### Step 2: Test Educational Enhancements (After Implementation)
```bash
# After implementing BUG-7, 8, 9
node test-enhanced-report.ts

# Verify new educational features
grep "Score Calculation:" enhanced-report-test.html
grep "Base Score (new user): 50/100" enhanced-report-test.html
grep "CRITICAL - Immediate Action Required" enhanced-report-test.html
grep "Required Learning" enhanced-report-test.html
grep "Scoring System:" enhanced-report-test.html
```

### Step 3: Full Integration Test
```bash
# Test with comprehensive mock data
node test-enhanced-report.ts

# Open report in browser
open enhanced-report-test.html  # macOS
# or
xdg-open enhanced-report-test.html  # Linux
# or
start enhanced-report-test.html  # Windows
```

## 🐛 Debug Commands

### Check Report Generator Methods
```bash
# Find specific methods in enhanced report generator
grep -n "generateSection10_EducationalInsights" src/standard/comparison/report-generator-v7-html-enhanced.ts
# Line ~1400

grep -n "renderDetailedIssue" src/standard/comparison/report-generator-v7-html-enhanced.ts
# Line ~850 - contains code snippet rendering

grep -n "getIssueTitle\|getIssueDescription" src/standard/comparison/report-generator-v7-html-enhanced.ts
# Helper methods to prevent undefined values
```

### Verify Educator Agent Integration
```bash
# Check if Educator agent exists and has required methods
grep -n "research" src/standard/educator/educator-agent.ts
# Should find the research() method

# Check for educational link generation
grep -n "getEducationalLink\|findMatchingCourses" src/standard/educator/educator-agent.ts
```

## 📝 Test Output Locations

### Generated Reports
- `/packages/agents/enhanced-report-test.html` - Main test output
- `/packages/agents/pr700-report.html` - PR #700 test output
- `/packages/agents/test-outputs/` - Additional test outputs

### Console Output Examples
```
🚀 Testing V7 Enhanced HTML Report with All Features
============================================================

📊 Mock Data Summary:
   Main branch: 5 issues
   Feature branch: 8 issues

📝 Generating V7 Enhanced HTML report...

🔍 Checking for Enhanced Features...

Feature Validation Results:
   ✅ Architecture Diagram: PRESENT
   ✅ Issue Impacts: PRESENT
   ✅ Code Snippets: PRESENT
   ✅ Fix Suggestions: PRESENT
   ✅ Educational Insights (Connected): PRESENT
   ✅ Business Impact Details: PRESENT
   ✅ PR Comment Section: PRESENT

🎉 ALL ENHANCED FEATURES ARE PRESENT!
✅ No undefined values found in the report!
```

## 🔧 Environment Setup for Tests

### Required Environment Variables
```bash
# Check if set
echo $OPENROUTER_API_KEY
echo $DEEPWIKI_API_URL
echo $SUPABASE_URL

# If not set, load from .env
source ../../.env
```

### Quick Environment Test
```bash
# Test environment is properly loaded
node -e "require('dotenv').config({path:'../../.env'}); console.log('API Key:', process.env.OPENROUTER_API_KEY ? 'Set' : 'Missing')"
```

## 📋 Test Checklist for Next Session

### Pre-Implementation Tests
- [ ] Run `node test-enhanced-report.ts` to verify current state
- [ ] Check for code snippets (BUG-3) - may already be working
- [ ] Count undefined values (should be 0)
- [ ] Verify all 6 original features are present

### Post-Implementation Tests (BUG-7, 8, 9)
- [ ] Skill score calculation displays correctly
- [ ] Issues ordered by severity (critical → high → medium → low)
- [ ] Each issue has educational link
- [ ] Motivational messages vary by severity
- [ ] Footnotes explain scoring system
- [ ] Base score 50/100 is mentioned
- [ ] Current score after deductions is shown

### Integration Tests
- [ ] No TypeScript compilation errors
- [ ] No runtime errors
- [ ] HTML renders correctly in browser
- [ ] PR comment section is copy-paste ready
- [ ] Educational links are clickable and valid

## 💡 Testing Tips

1. **Always build before testing**: `npm run build`
2. **Use mock data for fast iteration**: `USE_DEEPWIKI_MOCK=true`
3. **Check browser console for JS errors** when viewing HTML
4. **Save test outputs** for comparison: `cp enhanced-report-test.html enhanced-report-backup.html`
5. **Use diff to compare changes**: `diff enhanced-report-backup.html enhanced-report-test.html`

## 🚨 Common Issues and Fixes

### Issue: "Cannot find module"
```bash
# Rebuild the project
npm run build
```

### Issue: "undefined" in report
```typescript
// Use helper methods:
this.getIssueTitle(issue)  // Instead of issue.title
this.getIssueDescription(issue)  // Instead of issue.description
```

### Issue: Educator agent timeout
```typescript
// Add try-catch with fallback:
try {
  const educContent = await educator.research({...});
} catch (error) {
  // Use fallback educational links
}
```

---

**Note**: All test commands assume working directory is `/Users/alpinro/Code Prjects/codequal/packages/agents`