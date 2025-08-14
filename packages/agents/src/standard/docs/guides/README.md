# Guides & Best Practices

This directory contains how-to guides and best practices for working with the Standard Framework.

## 📄 Documents

### Report Generation
- **[REPORT_GENERATION_GUIDE.md](./REPORT_GENERATION_GUIDE.md)** - Complete guide to the 12-section report generation system
- **[V7_TEMPLATE_CONSISTENCY_GUIDE.md](./V7_TEMPLATE_CONSISTENCY_GUIDE.md)** - Ensuring consistency in V7 report templates

### Development Workflow
- **[DEV-CYCLE-ORCHESTRATOR-GUIDE.md](./DEV-CYCLE-ORCHESTRATOR-GUIDE.md)** - Guide for using the dev cycle orchestrator and creating session summaries

## 🎯 Quick Reference

### Report Sections (V7 Template)
1. PR Decision (APPROVE/DECLINE)
2. Executive Summary
3. Security Analysis
4. Performance Analysis
5. Code Quality Assessment
6. Architecture Analysis
7. Testing Coverage
8. Documentation Review
9. Breaking Changes
10. Dependencies & Compatibility
11. Risk Assessment
12. Recommendations

### PR Decision Logic
- **DECLINED**: Any critical or high severity issues
- **APPROVED**: Only low severity issues
- **CONDITIONAL**: Medium issues requiring review

### Best Practices
1. **Always await async operations** - Never call async without await
2. **Use interfaces for contracts** - Define clear interfaces
3. **Log at appropriate levels** - INFO for normal, ERROR for failures
4. **Handle errors gracefully** - Never let errors crash the system
5. **Document public APIs** - Add JSDoc comments

## 🔧 Common Tasks

### Adding a New Report Section
1. Update report template in `templates/`
2. Add section generator in `ReportGeneratorV7`
3. Update tests to verify section
4. Document in REPORT_GENERATION_GUIDE

### Modifying PR Decision Logic
1. Update decision logic in `ComparisonAgent`
2. Adjust thresholds in configuration
3. Test with various issue severities
4. Update pr-decision-logic.md

## 🔗 Related Documentation
- Architecture: [`../architecture/`](../architecture/)
- Implementation: [`../implementation/`](../implementation/)
- Testing: [`../testing/`](../testing/)