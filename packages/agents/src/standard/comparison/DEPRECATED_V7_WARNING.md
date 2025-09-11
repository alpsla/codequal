# ⚠️ DEPRECATED V7 CODE - DO NOT USE

## Status: DEPRECATED as of 2025-08-20

The V7 report generator has been deprecated in favor of V8. All V7 files in this directory are no longer maintained and should not be used.

## V7 Files (To Be Removed)
- report-generator-v7-fixed.ts
- report-generator-v7-enhanced-complete.ts
- report-generator-v7-architecture-enhanced.ts
- report-generator-v7-html.ts
- report-generator-v7-html-enhanced.ts
- report-template-v7.interface.ts

## Migration Path
Use **ReportGeneratorV8Final** from `report-generator-v8-final.ts` instead.

## Reference Implementation
See `/packages/agents/test-v8-final.ts` for the correct way to generate reports.

## Why V7 is Deprecated
1. Incompatible data structures with current pipeline
2. Buggy location handling
3. Incorrect score calculations
4. Conflicts with V8 implementation
5. No longer aligned with current requirements

## DO NOT:
- Import any V7 classes
- Use V7 in new code
- Try to fix V7 bugs
- Mix V7 and V8 code

## DO:
- Use ReportGeneratorV8Final
- Follow test-v8-final.ts patterns
- Refer to V8_WORKING_REFERENCE.md documentation