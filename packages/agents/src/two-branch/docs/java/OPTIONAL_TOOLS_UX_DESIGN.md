# Optional Analysis Features - UX/UI Design

**For Frontend/UX Developers**

**Last Updated**: September 30, 2025

---

## 📋 Overview

This document defines the user-facing interface for optional analysis features. Users should NOT see technical tool names (PMD, Checkstyle, etc.). Instead, they see simple options to enable enhanced analysis with clear time trade-offs.

---

## 🎯 Design Principles

1. **Hide Complexity**: Users don't need to know about SpotBugs, Dependency-Check, etc.
2. **Clear Trade-offs**: Show time cost vs. benefit upfront
3. **Simple Language**: Use user-friendly terms, not technical jargon
4. **Progressive Disclosure**: Start simple, show details only if needed

---

## 🎨 Configuration Interface

### Repository Settings → Analysis Configuration

**User View** (No Technical Tool Names):

```
┌─────────────────────────────────────────────────────────┐
│ Code Analysis Configuration                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Analysis Speed                                          │
│ ┌─────────────────────────────────────────────────┐   │
│ │ ● Standard (Recommended)                        │   │
│ │   ~2 minutes per pull request                   │   │
│ │                                                 │   │
│ │   Checks: Code quality, style, security         │   │
│ │                                                 │   │
│ │ ○ Enhanced                                      │   │
│ │   ~5 minutes per pull request                   │   │
│ │                                                 │   │
│ │   Everything in Standard, plus:                 │   │
│ │   • Deep bytecode analysis                      │   │
│ │   • Known vulnerability scanning                │   │
│ │                                                 │   │
│ │   Requires setup: [View Requirements]           │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ [Save Changes]                                          │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ Enhanced Analysis Requirements Modal

**Trigger**: User clicks "View Requirements" for Enhanced mode

```
┌─────────────────────────────────────────────────────────┐
│ Enhanced Analysis Setup                          [X]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Enhanced analysis provides deeper insights but         │
│ requires one-time setup.                               │
│                                                         │
│ ⏱️  Time Impact                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Standard:  ~2 minutes per PR                    │   │
│ │ Enhanced:  ~5 minutes per PR                    │   │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   │
│ │ Added time: +3 minutes                          │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ 📋 What You'll Need                                     │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 1. Working build system (Maven or Gradle)       │   │
│ │    Your code must compile successfully          │   │
│ │                                                 │   │
│ │ 2. Security database API key (free)             │   │
│ │    Register at: nvd.nist.gov (1-2 hour wait)   │   │
│ │                                                 │   │
│ │ 3. 3GB disk space for security database         │   │
│ │    Downloaded once, then kept updated           │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ 💡 What Enhanced Analysis Finds                        │
│ • Deeper bug detection (bytecode-level issues)         │
│ • Known security vulnerabilities in dependencies       │
│ • Critical issues that standard analysis might miss    │
│                                                         │
│ 🔑 Security Database API Key                           │
│ ┌─────────────────────────────────────────────────┐   │
│ │ [                                              ] │   │
│ └─────────────────────────────────────────────────┘   │
│ [Get Free API Key]  [Validate]                         │
│                                                         │
│ ⚠️  First Run Notice                                    │
│ The first analysis will take 15-20 minutes while       │
│ downloading the security database. Future runs will    │
│ be much faster (~5 minutes).                           │
│                                                         │
│ [Cancel]                          [Enable Enhanced]    │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Pull Request Analysis Status

### Standard Analysis (In Progress)

**User sees** (no tool names):

```
┌─────────────────────────────────────────────────────────┐
│ 🔄 Analyzing Pull Request #1234                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Analysis Progress                                       │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░ 60%                       │
│                                                         │
│ ⏱️  Time elapsed: 1m 15s                                │
│ ⏱️  Estimated remaining: 45s                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Enhanced Analysis (In Progress)

```
┌─────────────────────────────────────────────────────────┐
│ 🔄 Analyzing Pull Request #1234 (Enhanced)              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Analysis Progress                                       │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░ 60%                       │
│                                                         │
│ ⏱️  Time elapsed: 3m 10s                                │
│ ⏱️  Estimated remaining: 2m                             │
│                                                         │
│ Current stage: Scanning for known vulnerabilities      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Analysis Complete

### Standard Analysis Results

**User sees** (focus on findings, not tools):

```
┌─────────────────────────────────────────────────────────┐
│ CodeQual Analysis - PR #1234                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ❌ PR BLOCKED - 141 critical issues found               │
│                                                         │
│ Analysis completed in 2m 18s                           │
│                                                         │
│ [View Critical Issues] [View All Details]              │
└─────────────────────────────────────────────────────────┘
```

### Enhanced Analysis Results

```
┌─────────────────────────────────────────────────────────┐
│ CodeQual Analysis - PR #1234 (Enhanced)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ❌ PR BLOCKED - 146 critical issues found               │
│                                                         │
│ 🔍 Enhanced analysis found 5 additional critical issues │
│    • 3 deep bytecode issues                             │
│    • 2 known security vulnerabilities                   │
│                                                         │
│ Analysis completed in 4m 52s                           │
│                                                         │
│ [View Critical Issues] [View All Details]              │
└─────────────────────────────────────────────────────────┘
```

---

## 🚨 Error Notifications

### Build Failure (Enhanced Analysis)

**User sees**:

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Enhanced Analysis Partially Failed                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Some enhanced checks couldn't run because your code    │
│ doesn't compile.                                        │
│                                                         │
│ Standard analysis completed successfully with 138      │
│ critical issues found.                                  │
│                                                         │
│ 💡 To enable full enhanced analysis:                    │
│ • Fix compilation errors in your code                  │
│ • Ensure build configuration is valid                  │
│                                                         │
│ [View Standard Results] [View Build Errors]            │
└─────────────────────────────────────────────────────────┘
```

### API Key Issue

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Vulnerability Scanning Unavailable                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Couldn't check for known vulnerabilities because the   │
│ security database API key is invalid or expired.        │
│                                                         │
│ Other enhanced checks completed successfully.           │
│                                                         │
│ [Update API Key] [View Results Without Scan]           │
└─────────────────────────────────────────────────────────┘
```

### First-Time Database Download

```
┌─────────────────────────────────────────────────────────┐
│ ⏳ First-Time Setup in Progress                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Enhanced analysis is downloading the security          │
│ vulnerability database. This is a one-time process.    │
│                                                         │
│ Progress:                                               │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░ 1.8GB / 3.0GB (60%)      │
│                                                         │
│ ⏱️  Estimated time: 6 minutes remaining                │
│                                                         │
│ ℹ️  Your analysis will continue once the download      │
│    completes. Future analyses will be much faster.     │
│                                                         │
│ [Minimize]                                              │
└─────────────────────────────────────────────────────────┘
```

---

## 🔔 Mode Switching Warning

**Scenario**: User switches from Standard to Enhanced mid-project

```
┌─────────────────────────────────────────────────────────┐
│ Switch to Enhanced Analysis?                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Future pull requests will take longer to analyze:      │
│                                                         │
│ Current: ~2 minutes per PR                             │
│ Enhanced: ~5 minutes per PR (+3 minutes)               │
│                                                         │
│ 💡 Enhanced analysis provides:                          │
│ • Deeper bug detection                                 │
│ • Known vulnerability scanning                         │
│ • More comprehensive security checks                   │
│                                                         │
│ [ ] Re-analyze 3 open PRs with enhanced mode           │
│                                                         │
│ [Cancel]                              [Switch Mode]    │
└─────────────────────────────────────────────────────────┘
```

---

## 📱 Mobile/Compact View

For smaller screens, simplify even further:

```
┌──────────────────────────────┐
│ Analysis Mode                │
├──────────────────────────────┤
│                              │
│ ● Standard (~2 min)          │
│   Basic checks               │
│                              │
│ ○ Enhanced (~5 min)          │
│   Deeper analysis            │
│   [Setup Required]           │
│                              │
│ [Save]                       │
└──────────────────────────────┘
```

---

## 🎓 Help/Info Tooltips

### Standard Mode Tooltip
```
Standard analysis includes:
• Code quality checks
• Style consistency
• Security vulnerability detection

Fast results in ~2 minutes
```

### Enhanced Mode Tooltip
```
Enhanced analysis adds:
• Deep bytecode-level bug detection
• Known CVE vulnerability scanning
• Comprehensive dependency analysis

Takes ~5 minutes per PR
Requires one-time setup
```

---

## 📊 Settings Summary Page

After configuration, show summary:

```
┌─────────────────────────────────────────────────────────┐
│ Current Configuration                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Analysis Mode: Enhanced                                 │
│ Estimated Time: ~5 minutes per PR                      │
│                                                         │
│ Active Features:                                        │
│ ✅ Code quality analysis                                │
│ ✅ Style checking                                       │
│ ✅ Security scanning                                    │
│ ✅ Deep bytecode analysis                               │
│ ✅ Known vulnerability detection                        │
│                                                         │
│ Status: ✅ All systems ready                            │
│                                                         │
│ [Change Configuration]                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🧩 React Component Structure

```typescript
// Simple configuration component
<AnalysisConfiguration>
  <ModeSelector
    modes={[
      {
        id: 'standard',
        label: 'Standard',
        time: '~2 minutes',
        description: 'Code quality, style, security'
      },
      {
        id: 'enhanced',
        label: 'Enhanced',
        time: '~5 minutes',
        description: 'Everything + deep analysis',
        requiresSetup: true
      }
    ]}
    selected={currentMode}
    onChange={handleModeChange}
  />

  {showSetupModal && (
    <EnhancedSetupModal
      onComplete={handleSetupComplete}
      onCancel={handleCancel}
    />
  )}
</AnalysisConfiguration>
```

### Time Calculation (Internal, Not Exposed)

```typescript
// Backend calculates times based on enabled tools
function calculateAnalysisTime(mode: 'standard' | 'enhanced'): number {
  const baseTime = 139; // PMD + Checkstyle + Semgrep (internal)

  if (mode === 'enhanced') {
    return baseTime + 150; // +SpotBugs + Dependency-Check (internal)
  }

  return baseTime;
}

// Convert to user-friendly format
function formatTimeForUser(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return `~${minutes} minute${minutes > 1 ? 's' : ''}`;
}
```

---

## 📊 Analytics Events

Track user behavior (internal):

```typescript
// When user changes mode
analytics.track('analysis_mode_changed', {
  from: 'standard',
  to: 'enhanced',
  estimatedTimeIncrease: 180 // seconds
});

// When setup is completed
analytics.track('enhanced_analysis_setup_completed', {
  apiKeyProvided: true,
  setupDuration: 320 // seconds
});

// When first-time download happens
analytics.track('vulnerability_database_downloaded', {
  duration: 842, // seconds
  size: 3072 // MB
});
```

---

## ✅ Implementation Checklist

Frontend team should implement:

- [ ] Mode selector (Standard vs Enhanced)
- [ ] Enhanced setup modal with API key input
- [ ] Real-time progress indicator with time estimates
- [ ] Error notifications for build/API failures
- [ ] First-time download progress notification
- [ ] Mode switching confirmation dialog
- [ ] Mobile-responsive views
- [ ] Help tooltips explaining each mode
- [ ] Configuration summary page

Backend team should provide:

- [ ] API endpoint: `GET /analysis/time-estimate?mode=standard|enhanced`
- [ ] API endpoint: `POST /config/analysis-mode` (save user preference)
- [ ] API endpoint: `POST /config/validate-api-key` (test NVD key)
- [ ] Real-time progress updates via WebSocket/SSE
- [ ] Error codes for different failure types

---

## 🔐 Backend Configuration (Internal Only)

The backend maintains the actual tool configuration:

```typescript
// Internal configuration (never exposed to users)
const toolConfig = {
  standard: {
    tools: ['pmd', 'checkstyle', 'semgrep'],
    estimatedTime: 139
  },
  enhanced: {
    tools: ['pmd', 'checkstyle', 'semgrep', 'spotbugs', 'dependency-check'],
    estimatedTime: 289,
    requirements: {
      buildSystem: true,
      nvdApiKey: true
    }
  }
};
```

Users never see tool names. They only see:
- "Standard" or "Enhanced"
- Time estimates
- General feature descriptions

---

## 📚 User-Facing Documentation

### FAQ Section

**Q: What's the difference between Standard and Enhanced analysis?**

A: Standard analysis checks your code for quality, style, and security issues in about 2 minutes. Enhanced analysis does everything Standard does, plus deeper bug detection and known vulnerability scanning, taking about 5 minutes.

**Q: Why does Enhanced analysis take longer?**

A: Enhanced analysis compiles your code and checks it against a comprehensive vulnerability database, which takes additional time but finds issues that Standard analysis might miss.

**Q: Do I need Enhanced analysis?**

A: Enhanced analysis is recommended for:
- Production releases
- Regulated industries (finance, healthcare)
- Projects with security compliance requirements

Standard analysis is usually sufficient for day-to-day development.

**Q: Can I switch between modes?**

A: Yes, you can change modes anytime. Future pull requests will use your new setting.

---

**Document Status**: Complete
**Last Updated**: September 30, 2025
**Owner**: UX/Frontend Team
**Key Principle**: Hide tool complexity, show user value