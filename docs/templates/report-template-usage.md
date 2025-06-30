# CodeQual Analysis Report Template Usage Guide

## Overview

The final analysis report template (`analysis-report-final-template.html`) provides a comprehensive, structured format for presenting code analysis results. The template follows a logical flow designed to maximize developer engagement and action.

## Report Structure (In Order)

### 1. **PR Approval Decision** (Most Important)
- Clear visual indication: Approved ✅, Rejected ❌, or Conditional ⚠️
- Lists blocking issues that must be fixed
- Shows positive findings to maintain morale
- Template variables:
  - `{{approval_status}}`: "APPROVED", "REJECTED", or "CONDITIONAL APPROVAL"
  - `{{approval_status_class}}`: "approved", "rejected", or "conditional"
  - `{{approval_icon}}`: "✅", "❌", or "⚠️"
  - `{{blocking_issues}}`: Array of critical/high issues preventing approval
  - `{{positive_findings}}`: Array of good practices found

### 2. **Current PR Issues**
- Issues found in the submitted pull request
- Organized by severity (Critical → High → Medium → Low)
- Each issue includes:
  - Code snippet showing the problem
  - Recommended fix with example
  - File location and line number
- Template variables:
  - `{{pr_issues_count}}`: Total number of issues
  - `{{pr_issues_by_severity}}`: Array of issues grouped by severity
  - Each issue has: `severity`, `title`, `description`, `code_snippet`, `recommendation`, `fix_example`

### 3. **Repository Issues** (Technical Debt)
- Existing issues affecting skill scores
- Show/hide toggle for medium/low priority issues
- Shows impact on score and potential gains
- Template variables:
  - `{{total_repo_issues}}`: Total count
  - `{{high_priority_repo_issues}}`: Critical and high severity issues
  - `{{lower_priority_repo_issues}}`: Medium and low issues (hidden by default)
  - Each issue includes degradation points and fix reward points

### 4. **Prioritized Recommendations**
- Actionable steps organized by priority
- Includes effort estimates and impact
- Template variables:
  - `{{priority_recommendations}}`: Array of recommendations
  - Each has: `priority`, `title`, `description`, `effort`, `impact`

### 5. **Skill Impact & Score**
- Overall developer score (0-100 scale)
- Score breakdown showing components
- Individual skill levels with progress bars
- Template variables:
  - `{{overall_score}}`: Current score (0-100)
  - `{{score_components}}`: Breakdown of score factors
  - `{{skill_categories}}`: Array of skills with current levels and impacts

### 6. **Educational Resources**
- Learning modules tailored to identified issues
- Personalized learning path based on skill gaps
- Template variables:
  - `{{educational_modules}}`: Array of recommended resources
  - `{{personalized_recommendations}}`: Custom learning path

## Template Variables Reference

### Header Variables
```handlebars
{{pr_number}} - Pull request number
{{repository_name}} - Short repository name
{{repository_full_name}} - Full repository path (owner/repo)
{{primary_language}} - Main programming language
{{files_changed}} - Number of files modified
{{lines_added}} - Lines added
{{lines_removed}} - Lines removed
```

### Scoring Variables
```handlebars
{{overall_score}} - Current score (0-100)
{{score_level_description}} - E.g., "Intermediate Developer (Room to grow)"
{{score_components}} - Array with:
  - name: Component name
  - points_display: "+85" or "-8"
  - points_class: "points-positive" or "points-negative"
  - description: Explanation
```

### Issue Variables
```handlebars
{{severity}} - "CRITICAL", "HIGH", "MEDIUM", "LOW"
{{severity_class}} - "critical", "high", "medium", "low"
{{title}} - Issue title
{{description}} - Issue description
{{code_snippet}} - Problematic code
{{fix_example}} - Suggested fix code
{{file_path}} - File location
{{line_number}} - Line number
{{degradation_points}} - Points lost (e.g., "-0.5")
{{fix_points}} - Points gained if fixed (e.g., "+2.0")
```

### Skill Variables
```handlebars
{{skill_categories}} - Array of skills:
  - icon: "🛡️", "📝", "⚡", etc.
  - name: "Security", "Code Quality", etc.
  - current_level: 0-100
  - impact_items: Array of impacts on this skill
```

### Educational Variables
```handlebars
{{educational_modules}} - Array of learning resources:
  - title: Module name
  - duration: "15 minutes"
  - level: "Beginner", "Intermediate", "Advanced"
  - description: What you'll learn
  - topics: Comma-separated topics
  - url: Link to resource
```

## Conditional Sections

The template uses Handlebars conditionals for dynamic content:

```handlebars
{{#if has_pr_issues}}
  <!-- Show PR issues -->
{{else}}
  <!-- Show "No issues found" message -->
{{/if}}

{{#if has_lower_priority_issues}}
  <!-- Show toggle button and hidden section -->
{{/if}}
```

## Styling Classes

### Severity Classes
- `.critical` - Red theme for critical issues
- `.high` - Orange theme for high priority
- `.medium` - Yellow theme for medium priority
- `.low` - Gray theme for low priority

### Status Classes
- `.approved` - Green border and background
- `.rejected` - Red border and background
- `.conditional` - Orange border and background

### Component Classes
- `.points-positive` - Green color for positive points
- `.points-negative` - Red color for negative points
- `.priority-high` - Orange background
- `.priority-medium` - Yellow background
- `.priority-low` - Blue background

## JavaScript Functions

### toggleLowerPriorityIssues()
Toggles visibility of medium/low priority repository issues.

### URL Parameters
- `?show=all` - Automatically expands all issues on load

## Best Practices

1. **Always populate approval decision** - This is the most important section
2. **Include code snippets** - Visual examples are more impactful
3. **Provide actionable fixes** - Don't just identify problems, show solutions
4. **Keep educational content relevant** - Match resources to actual issues found
5. **Use clear scoring** - Show current state and potential improvements

## Example Usage

```javascript
const reportData = {
  pr_number: 150,
  repository_name: "vercel/ms",
  approval_status: "CONDITIONAL APPROVAL",
  approval_status_class: "conditional",
  approval_icon: "⚠️",
  overall_score: 72,
  pr_issues_count: 3,
  pr_issues_by_severity: [
    {
      severity: "CRITICAL",
      severity_class: "critical",
      title: "SQL Injection Vulnerability",
      description: "User input directly concatenated into query",
      code_snippet: "const query = `SELECT * FROM users WHERE id = '${userId}'`;",
      recommendation: "Use parameterized queries",
      fix_example: "const query = 'SELECT * FROM users WHERE id = ?';"
    }
  ],
  // ... more data
};

// Render with Handlebars or similar template engine
const html = template(reportData);
```

## Customization

The template is designed to be customized:
1. Modify color schemes in CSS variables
2. Add new sections as needed
3. Adjust scoring algorithms
4. Add company branding
5. Integrate with CI/CD pipelines

## Accessibility

The template includes:
- Semantic HTML structure
- ARIA labels where appropriate
- Color contrast compliance
- Keyboard navigation support
- Screen reader friendly content

## Performance

- Animations use CSS transforms for better performance
- Images are optional and lazy-loaded
- Minimal JavaScript for core functionality
- Print-friendly styling included