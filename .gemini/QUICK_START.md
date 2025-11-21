# Gemini Workflow System - Quick Start Guide

## ✅ What's Been Created

You now have a complete Gemini-compatible workflow system that mirrors your Claude agents!

### 📂 New Directory Structure

```
.gemini/
└── workflows/
    ├── README.md                        # Complete workflow documentation
    ├── business-owner-analysis.md       # Strategic business analysis
    ├── market-researcher.md             # Competitive intelligence
    └── session-starter.md               # Session preparation
```

### 🎯 Available Workflows

#### 1. **Business Owner Analysis**
- **Purpose**: CEO-level strategic oversight and business analysis
- **Trigger**: "Run business owner analysis"
- **Use For**: Weekly reports, feature decisions, launch decisions, competitive analysis
- **Output**: `/docs/business-intelligence/[subdirectory]/`

#### 2. **Market Researcher**
- **Purpose**: Competitive intelligence and market monitoring
- **Trigger**: "Run market researcher"
- **Use For**: Pricing analysis, sentiment tracking, competitor research
- **Output**: `/docs/market-research/[subdirectory]/`

#### 3. **Session Starter**
- **Purpose**: Quick session preparation and environment setup
- **Trigger**: "Start session"
- **Use For**: Beginning every development session
- **Output**: Console with status and commands

## 🚀 How to Use (Simple!)

### Example 1: Start Your Session
```
You: "Start session"

AI will:
✅ Read QUICK_START_NEXT_SESSION.md
✅ Check Redis, build, dependencies
✅ Show active bugs and priorities
✅ Provide quick commands
✅ Tell you where to continue
```

### Example 2: Get Strategic Analysis
```
You: "Run business owner analysis for weekly status"

AI will:
✅ Read all planning docs
✅ Check bug status
✅ Review marketing plans
✅ Trigger market researcher (if needed)
✅ Generate comprehensive report
✅ Save to /docs/business-intelligence/weekly-reports/
```

### Example 3: Research Competitors
```
You: "Run market researcher to analyze GitHub Copilot pricing"

AI will:
✅ Research GitHub Copilot pricing
✅ Compare with our pricing
✅ Analyze competitive position
✅ Provide recommendations
✅ Save to /docs/market-research/
```

## 🔄 Workflow Orchestration

Workflows can trigger each other automatically!

**Example: Business Owner triggers Market Researcher**
```
You: "Run business owner analysis"

Behind the scenes:
1. Business Owner reads internal status
2. Identifies need for market intelligence
3. Automatically triggers Market Researcher
4. Market Researcher gathers competitive data
5. Business Owner synthesizes final report

You get: Complete analysis with internal + external intelligence
```

## 📋 Comparison: Claude vs Gemini

| Feature | Claude Agents | Gemini Workflows |
|---------|---------------|------------------|
| **Location** | `.claude/agents/` | `.gemini/workflows/` |
| **Invocation** | Automatic | Manual trigger phrase |
| **Execution** | Autonomous | Step-by-step guided |
| **Best For** | VS Code | Antigravity |
| **Functionality** | ✅ Full | ✅ Full (same) |

## 🎯 Recommended Usage

### Daily
```
"Start session"
```

### Weekly
```
"Run business owner analysis for weekly status"
```

### As Needed
```
"Run market researcher for [specific competitor/topic]"
```

## 📚 Full Documentation

- **Workflow Details**: `.gemini/workflows/README.md`
- **Usage Guide**: `AI_ASSISTANT_GUIDE.md` (section: "Using Gemini Workflows")
- **Claude Agents Reference**: `.claude/agents/` (for comparison)

## ✨ Key Benefits

1. **Same Functionality**: All Claude agent capabilities available in Gemini
2. **Simple Triggers**: Just say "Run business owner analysis"
3. **Automatic Orchestration**: Workflows trigger each other when needed
4. **Consistent Output**: Same report locations and formats
5. **Easy to Extend**: Create new workflows following the template

## 🔧 Next Steps

1. **Try it now**: Say "Start session" to test session-starter workflow
2. **Review workflows**: Check `.gemini/workflows/README.md` for details
3. **Create custom workflows**: Follow the template to add your own

---

**You're all set!** Your Gemini workflows are ready to use in Antigravity. 🎉
