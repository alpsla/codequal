# Archived Calibration Scripts (June 2025)

**Archive Date**: November 6, 2025
**Original Location**: `packages/core/scripts/calibration/`

---

## Purpose

This directory contains historical model calibration experiments from June 2025.

## Reason for Archive

- **Experimental code**: Not actively used in production
- **Age**: 5 months old (June 9, 2025)
- **Status**: Experiments completed, results documented
- **Redundancy**: Multiple variations of similar analysis logic

## Contents

### Analysis Scripts
```
analyze-deepseek-coder.js (9.4K)  - DeepSeek model calibration
analyze-model-data.js (8.9K)      - Model data analysis
analyze-repo-light.js (7.1K)      - Lightweight repo analysis
analyze-repo.py (4.9K)            - Python repo analyzer
analyze-repo.sh (1.1K)            - Shell repo analysis wrapper
analyze-scoring-variants.js (5.5K) - Scoring variations testing
analyze-with-deepwiki.sh (1.7K)   - DeepWiki integration analysis
```

### Repository Analyzers
```
repo-analyzer-simple.js (4.3K)    - Simple analyzer implementation
repo-analyzer.js (6.0K)           - Full analyzer implementation
standalone-analyzer.sh (5.4K)     - Standalone analysis script
```

### Subdirectories
```
calibration/              - 100+ calibration experiment files
calibration-reports/      - Generated calibration reports
reports/                  - Additional analysis reports
```

## Historical Context

These scripts were used during the initial model calibration phase to:
- Test different AI models for code analysis
- Compare scoring methodologies
- Benchmark repository analysis performance
- Experiment with DeepWiki integration

## If You Need This Code

The code is preserved here for historical reference. If you need to:
- Reference calibration methodologies
- Review experimental analysis approaches
- Understand historical model comparisons

The files are available in this archive.

## Production Replacement

Current production code for similar functionality:
- Model selection: `packages/core/src/services/model-selection/`
- Repository analysis: `packages/agents/src/two-branch/`
- Calibration: `packages/testing/` (active calibration tests)

---

**Archived By**: Documentation Cleanup Session 2025-11-06
**Safe to Delete**: After 6 months (May 2026) if not referenced
