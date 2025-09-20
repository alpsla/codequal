# V9 Template Validator

A comprehensive validation tool for V9 CodeQual analysis reports that ensures all 34 required sections are present and properly formatted.

## Overview

The V9 Template Validator checks generated reports against the complete V9 template specification, ensuring compliance with all required sections including:

- Executive summaries and decisions
- Issue analysis and categorization
- Business impact assessments
- Educational resources and skill tracking
- Performance metrics and cost analysis
- Technical debt and security posture
- CI/CD integration status and sprint planning

## Quick Start

### Programmatic Usage

```typescript
import { validateV9Report, isValidV9Report, V9TemplateValidator } from './validators';

// Quick validation
const reportContent = fs.readFileSync('report.md', 'utf-8');
const result = validateV9Report(reportContent);
console.log(`Score: ${result.score}% (${result.foundSections}/${result.totalSections})`);

// Check against threshold
const isValid = isValidV9Report(reportContent, 90);
console.log(`Meets 90% threshold: ${isValid}`);

// Detailed validation
const validator = new V9TemplateValidator();
const detailedReport = validator.generateValidationReport(result);
console.log(detailedReport);
```

### Command Line Usage

```bash
# Validate a report with default 90% threshold
npx ts-node cli-validator.ts report.md

# Validate with custom threshold
npx ts-node cli-validator.ts -f report.md -t 80

# Show detailed validation report
npx ts-node cli-validator.ts report.md --verbose

# Output results as JSON
npx ts-node cli-validator.ts report.md --json

# List all required sections
npx ts-node cli-validator.ts --list
```

## Required Sections (34 Total)

The V9 template requires the following sections:

### Core Analysis (1-10)
1. **Executive Summary** - High-level overview with immediate risk
2. **Decision** - ONLY "APPROVED" or "DECLINED"
3. **Issue Summary** - New/Existing/Resolved/Blocking/Backlog statistics
4. **Detailed Issues with Education** - Comprehensive issue analysis
5. **Business Impact Analysis** - ROI and financial risk assessment
6. **Risk Matrix with Explanations** - Probability × Impact calculations
7. **Score Calculation Breakdown** - Transparent scoring methodology
8. **Skills Development Tracking** - Developer skill progression
9. **Personalized PR Comment** - Auto-generated team-specific comment
10. **AI-Powered Fix Suggestions** - Automated code fixes

### Educational & Resources (11-15)
11. **Educational Resources** - Curated learning materials
12. **Phased Educational Plan** - Structured learning roadmap
13. **Team Skills Tracking** - Team-wide skill assessment
14. **Analysis Metadata** - Technical execution details
15. **Performance Metrics** - Analysis timing and efficiency

### Advanced Analytics (16-25)
16. **Agent Performance Tracking** - AI model performance metrics
17. **Tool Performance Metrics** - Individual tool efficiency
18. **Cost Analysis Breakdown** - Detailed API and infrastructure costs
19. **Recommended Actions** - Specific actionable recommendations
20. **Resolution Metrics** - Issue resolution patterns and trends
21. **Progress Tracking** - Historical baseline comparisons
22. **Quality Trends** - Code quality progression over time
23. **Achievement Tracking** - Team and individual achievements
24. **Learning Path Progress** - Educational pathway tracking
25. **Code Ownership Map** - Responsibility mapping

### Technical Assessment (26-34)
26. **Technical Debt Tracking** - Debt assessment and trending
27. **Security Posture Assessment** - Comprehensive security evaluation
28. **Performance Optimization Opportunities** - Performance improvements
29. **Architecture Compliance Report** - Design pattern analysis
30. **Dependency Health Check** - Third-party dependency security
31. **Monitoring & Alerts Configuration** - Observability recommendations
32. **CI/CD Integration Status** - Pipeline integration status
33. **Next Sprint Planning** - Sprint recommendations
34. **Footer with Timestamps** - Generation metadata and timestamps

## API Reference

### Classes

#### `V9TemplateValidator`

Main validator class for comprehensive report validation.

```typescript
class V9TemplateValidator {
  validateReport(reportContent: string): ValidationResult
  generateValidationReport(result: ValidationResult): string
  getValidationScore(reportContent: string): number
  meetsMinimumRequirements(reportContent: string, minimumScore?: number): boolean
  validateSpecificSections(reportContent: string, sectionIds: number[]): ValidationResult
}
```

### Functions

#### `validateV9Report(reportContent: string): ValidationResult`

Validates a report and returns detailed results.

#### `isValidV9Report(reportContent: string, minimumScore?: number): boolean`

Quick validation check against a minimum score threshold.

### Types

#### `ValidationResult`

```typescript
interface ValidationResult {
  isValid: boolean;           // All required sections present
  totalSections: number;      // Total required sections (34)
  foundSections: number;      // Number of sections found
  missingSections: V9TemplateSection[];  // Missing required sections
  presentSections: V9TemplateSection[]; // Present sections
  score: number;              // Percentage score (0-100)
}
```

#### `V9TemplateSection`

```typescript
interface V9TemplateSection {
  id: number;                 // Unique section ID (1-34)
  name: string;               // Human-readable section name
  required: boolean;          // Whether section is required
  patterns: string[];         // Regex patterns to match section
  description: string;        // Section purpose description
}
```

## CLI Reference

### Options

- `-f, --file FILE` - Path to V9 report file to validate
- `-t, --threshold NUM` - Minimum percentage threshold (default: 90)
- `-v, --verbose` - Show detailed validation report
- `-j, --json` - Output results in JSON format
- `-l, --list` - List all 34 required sections
- `-h, --help` - Show help message

### Exit Codes

- `0` - Report is valid (meets threshold)
- `1` - Report is invalid (below threshold)
- `2` - Error (file not found, invalid arguments, etc.)

## Examples

### Integration with V9 Report Generator

```typescript
import { V9TemplateValidator } from './validators';
import { generateV9Report } from './report-generator';

async function generateValidatedReport(analysisData: any) {
  // Generate report
  const report = await generateV9Report(analysisData);

  // Validate completeness
  const validator = new V9TemplateValidator();
  const validation = validator.validateReport(report);

  if (!validation.isValid) {
    console.warn(`Report missing ${validation.missingSections.length} sections`);
    validation.missingSections.forEach(section => {
      console.warn(`- Missing: ${section.name}`);
    });
  }

  return {
    report,
    validation,
    score: validation.score
  };
}
```

### Automated CI/CD Validation

```bash
#!/bin/bash
# Validate V9 report in CI/CD pipeline

npx ts-node cli-validator.ts generated-report.md --json > validation-results.json

if [ $? -eq 0 ]; then
  echo "✅ Report validation passed"
else
  echo "❌ Report validation failed"
  exit 1
fi
```

### Custom Section Validation

```typescript
// Validate only core sections (1-10)
const coreValidation = validator.validateSpecificSections(
  reportContent,
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
);

console.log(`Core sections: ${coreValidation.score}%`);
```

## Testing

Run the test suite to verify validator functionality:

```bash
# Run comprehensive test
npx ts-node test-v9-validator.ts

# Test CLI functionality
npx ts-node cli-validator.ts --help
npx ts-node cli-validator.ts --list
```

## Development

### Adding New Required Sections

To add new required sections, update the `V9_REQUIRED_SECTIONS` array in `v9-template-validator.ts`:

```typescript
{
  id: 35,
  name: "New Section Name",
  required: true,
  patterns: [
    "New Section",
    "## New Section",
    "📊 New Section"
  ],
  description: "Description of what this section should contain"
}
```

### Custom Validation Patterns

Each section can have multiple regex patterns for flexible matching:

```typescript
patterns: [
  "Exact Match Text",           // Exact string match
  "## Markdown Header",         // Markdown header format
  "🎯 Emoji Header",           // With emoji prefix
  "pattern.*regex",             // Regex patterns
  "(?i)case.*insensitive"       // Case insensitive patterns
]
```

## Integration

The validator is designed to integrate seamlessly with:

- V9 report generators
- CI/CD pipelines
- Quality assurance workflows
- Automated testing suites
- Development environments

For questions or improvements, refer to the main CodeQual V9 documentation.