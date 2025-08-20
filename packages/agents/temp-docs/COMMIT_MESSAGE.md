# Suggested Commit Message

```
refactor(agents): Clean up V7/V8 confusion and document healthy code

BREAKING CHANGE: V7 report generators are now deprecated. Default export changed to V8.

- Created comprehensive documentation for code health status
- Documented V8 (test-v8-final.ts) as the only working implementation  
- Archived 9 deprecated test files that use broken V7 code
- Updated module exports to use V8 as default ReportGenerator
- Added deprecation warnings to all V7 references
- Created data flow guide showing working vs broken pipelines
- Updated CLAUDE.md with correct testing procedures

Key findings:
- V8 generator works perfectly with proper data
- DeepWiki parser is broken (returns all locations as "unknown")
- Must use USE_DEEPWIKI_MOCK=true until parser is fixed

Docs created:
- V8_WORKING_REFERENCE.md - Working implementation guide
- CODE_HEALTH_STATUS.md - Tracks healthy vs broken code
- DATA_FLOW_GUIDE.md - Data structure documentation
- DEPRECATED_V7_WARNING.md - V7 deprecation notice
- CLEANUP_SUMMARY_2025-08-20.md - Summary of changes

This cleanup eliminates confusion about which code is working and provides
clear guidance for future development.

Refs: BUG-068, BUG-069, BUG-070, BUG-071
```