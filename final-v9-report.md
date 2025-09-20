✅ Environment loaded from: /Users/alpinro/Code Prjects/codequal/.env
🚀 Testing V9 Report Generation with All Fixes
============================================================

📝 Generating comprehensive report...

[TrulyDynamicSelector] Selecting models for role: analysis
[TrulyDynamicSelector] Found 327 total models in OpenRouter
[TrulyDynamicSelector] 285 models meet basic requirements
[TrulyDynamicSelector] Selected primary: google/gemini-2.5-pro (score: 1.18)
[TrulyDynamicSelector] Selected fallback: anthropic/claude-opus-4.1 (score: 1.08)
[TrulyDynamicSelector] Selecting models for role: analysis
[TrulyDynamicSelector] Found 327 total models in OpenRouter
[TrulyDynamicSelector] 285 models meet basic requirements
[TrulyDynamicSelector] Selected primary: google/gemini-2.5-pro (score: 1.18)
[TrulyDynamicSelector] Selected fallback: anthropic/claude-opus-4.1 (score: 1.08)
[TrulyDynamicSelector] Selecting models for role: analysis
[TrulyDynamicSelector] Found 327 total models in OpenRouter
[TrulyDynamicSelector] 285 models meet basic requirements
[TrulyDynamicSelector] Selected primary: google/gemini-2.5-pro (score: 1.18)
[TrulyDynamicSelector] Selected fallback: anthropic/claude-opus-4.1 (score: 1.08)
[TrulyDynamicSelector] Selecting models for role: analysis
[TrulyDynamicSelector] Found 327 total models in OpenRouter
[TrulyDynamicSelector] 285 models meet basic requirements
[TrulyDynamicSelector] Selected primary: google/gemini-2.5-pro (score: 1.18)
[TrulyDynamicSelector] Selected fallback: anthropic/claude-opus-4.1 (score: 1.08)
[TrulyDynamicSelector] Selecting models for role: analysis
[TrulyDynamicSelector] Found 327 total models in OpenRouter
[TrulyDynamicSelector] 285 models meet basic requirements
[TrulyDynamicSelector] Selected primary: google/gemini-2.5-pro (score: 1.18)
[TrulyDynamicSelector] Selected fallback: anthropic/claude-opus-4.1 (score: 1.08)
❌ Error generating report: TypeError: Cannot read properties of undefined (reading 'security')
    at V9ReportFormatterFinal.generateSkillsTracking (/Users/alpinro/Code Prjects/codequal/packages/agents/dist/two-branch/analyzers/v9-report-formatter.js:764:34)
    at V9ReportFormatterFinal.generateCompleteReport (/Users/alpinro/Code Prjects/codequal/packages/agents/dist/two-branch/analyzers/v9-report-formatter.js:71:28)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async testV9Report (/Users/alpinro/Code Prjects/codequal/test-v9-final-report.js:253:20)
TypeError: Cannot read properties of undefined (reading 'security')
    at V9ReportFormatterFinal.generateSkillsTracking (/Users/alpinro/Code Prjects/codequal/packages/agents/dist/two-branch/analyzers/v9-report-formatter.js:764:34)
    at V9ReportFormatterFinal.generateCompleteReport (/Users/alpinro/Code Prjects/codequal/packages/agents/dist/two-branch/analyzers/v9-report-formatter.js:71:28)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async testV9Report (/Users/alpinro/Code Prjects/codequal/test-v9-final-report.js:253:20)
