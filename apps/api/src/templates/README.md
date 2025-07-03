# CodeQual Report Template System

## Overview

This is a modular, multilingual report generation system that separates concerns for better maintainability.

## Directory Structure

```
templates/
├── base/
│   ├── layout.html          # Base HTML structure
│   ├── styles.css          # All CSS styles (extracted)
│   └── scripts.js          # All JavaScript (extracted)
├── components/
│   ├── header.html         # Report header
│   ├── pr-decision.html    # PR approval decision
│   ├── pr-issues.html      # Current PR issues
│   ├── repo-issues.html    # Repository issues
│   ├── score-display.html  # Score visualization
│   ├── skills-breakdown.html # Skills analysis
│   ├── educational.html    # Learning resources
│   ├── pr-comment.html     # Suggested PR comment
│   └── footer.html         # Report footer
├── languages/
│   ├── en.json            # English
│   ├── ru.json            # Russian
│   ├── es.json            # Spanish
│   ├── fr.json            # French
│   ├── de.json            # German
│   ├── ja.json            # Japanese
│   ├── zh.json            # Chinese
│   ├── pt.json            # Portuguese
│   ├── it.json            # Italian
│   └── ko.json            # Korean
├── analysis-report-template.html  # Clean single-language template
├── report-generator.ts            # Modular report generator
└── README.md                      # This file
```

## Key Improvements

1. **Separation of Concerns**
   - HTML structure separated from CSS and JavaScript
   - Components are modular and reusable
   - Translations are in separate JSON files

2. **Multilingual Support**
   - 10 languages supported out of the box
   - Easy to add new languages (just add a new JSON file)
   - Language switcher redirects to appropriate language version

3. **Maintainability**
   - Each component can be edited independently
   - CSS changes don't require touching HTML
   - Adding new sections is straightforward

4. **Performance**
   - CSS and JS files can be cached separately
   - Smaller HTML files per language
   - Components can be lazy-loaded if needed

## Usage

### Using the Modular Generator

```typescript
import { ModularReportGenerator } from './templates/report-generator';

const generator = new ModularReportGenerator('./templates');

// Generate all language versions
await generator.generateMultilingualReports(reportData, './output');

// Or generate a specific language
await generator.generateReport({
    language: 'en',
    data: reportData,
    outputPath: './output/report-en.html'
});
```

### Using the Template Directly

The `analysis-report-template.html` can be used with any template engine that supports Handlebars syntax.

## Adding a New Language

1. Create a new JSON file in `languages/` directory (e.g., `nl.json` for Dutch)
2. Copy the structure from `en.json`
3. Translate all text values
4. Add the language option to the dropdown in `layout.html`

## Customization

### Adding a New Component

1. Create a new HTML file in `components/`
2. Use Handlebars syntax for variables
3. Add the component to the generator's component list
4. Update the layout if needed

### Styling Changes

All styles are in `base/styles.css`. The CSS is organized by:
- Reset and base styles
- Component-specific styles
- Responsive design rules

### Adding New JavaScript Functionality

Add functions to `base/scripts.js`. The file is organized by:
- Language handling
- UI interactions
- Initialization code

## Data Structure

The report expects data in this format:

```typescript
{
  pr_number: string,
  repository_name: string,
  repository_full_name: string,
  primary_language: string,
  files_changed: number,
  lines_added: number,
  lines_removed: number,
  approval_status: 'approved' | 'conditionally_approved' | 'rejected',
  blocking_issues: Array<{
    severity: string,
    description: string,
    icon: string
  }>,
  pr_issues: Array<{
    title: string,
    severity: string,
    file_path: string,
    line_number: string,
    description: string,
    code_snippet?: string,
    recommendation?: string
  }>,
  // ... more fields
}
```

## Benefits of This Approach

1. **Easier Maintenance**: Update translations without touching code
2. **Better Performance**: Static files can be CDN-cached
3. **Cleaner Code**: No mixed languages in HTML
4. **Scalability**: Easy to add new languages or components
5. **Reusability**: Components can be used in other reports
6. **Testing**: Each component can be tested independently