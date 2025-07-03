# Report Generation API Documentation

## Overview

The CodeQual Report Generation API provides a dynamic, multilingual report generation system for PR analysis results. Reports are generated on-demand via API calls, eliminating the need for pre-generated files.

## API Endpoint

```
POST /api/generate-report
```

## Request Format

```json
{
  "language": "en",  // Optional, default: "en"
  "analysisData": {
    // Required fields
    "pr_number": "#1234",
    "repository_name": "project-name",
    "repository_full_name": "org/project-name",
    "primary_language": "TypeScript",
    "files_changed": 10,
    "lines_added": 250,
    "lines_removed": 100,
    
    // Approval status (required)
    "approval_status": "blocked|conditionally_approved|approved",
    "approval_icon": "🚫|⚠️|✅",
    "approval_message": "Reason for the decision",
    
    // Issues and findings
    "blocking_issues": [...],
    "positive_findings": [...],
    "pr_issues": [...],
    "high_priority_repo_issues": [...],
    "lower_priority_repo_issues": [...],
    
    // Scoring
    "overall_score": 75,
    "score_message": "Score explanation",
    "skill_categories": [...],
    
    // Educational resources
    "educational_modules": [...],
    
    // PR comment
    "pr_comment_text": "Formatted comment text",
    
    // Metadata
    "analysis_id": "unique-id",
    "timestamp": "2024-01-01T10:00:00Z"
  }
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "reportUrl": "/reports/report-abc123-en.html",
  "availableLanguages": ["en", "ru", "es", "fr", "de", "ja", "zh", "pt", "it", "ko"]
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "availableLanguages": ["en", "ru", ...]  // When language is invalid
}
```

## Supported Languages

- `en` - English
- `ru` - Russian (Русский)
- `es` - Spanish (Español)
- `fr` - French (Français)
- `de` - German (Deutsch)
- `ja` - Japanese (日本語)
- `zh` - Chinese (中文)
- `pt` - Portuguese (Português)
- `it` - Italian (Italiano)
- `ko` - Korean (한국어)

## Data Structure Details

### Blocking Issues
```json
{
  "icon": "🛡️",
  "severity": "Critical|High|Medium|Low",
  "description": "Issue description"
}
```

### PR Issues
```json
{
  "severity": "Critical|High|Medium|Low",
  "severity_class": "critical|high|medium|low",
  "title": "Issue title",
  "file_path": "src/file.ts",
  "line_number": "123",
  "description": "Detailed description",
  "code_snippet": "const bad = code;",
  "recommendation": "How to fix"
}
```

### Repository Issues
```json
{
  "severity": "Critical|High|Medium|Low",
  "severity_class": "critical|high|medium|low",
  "title": "Issue title",
  "description": "Issue description",
  "code_snippet": "Optional code example",
  "impact_color": "#dc3545",
  "impact_description": "Impact on the project"
}
```

### Skill Categories
```json
{
  "icon": "🛡️",
  "name": "Security",
  "current_level": 75,
  "skill_color": "#28a745",
  "skill_message": "Points change explanation"
}
```

### Educational Modules
```json
{
  "title": "Course title",
  "duration": "3",  // hours
  "level": "Beginner|Intermediate|Advanced",
  "description": "What you'll learn"
}
```

## Testing the API

### Using cURL
```bash
curl -X POST http://localhost:3001/api/generate-report \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en",
    "analysisData": { ... }
  }'
```

### Using Node.js Test Script
```bash
cd test-scripts
node test-report-api.js
```

### Using Shell Script
```bash
cd test-scripts
chmod +x test-report-api.sh
./test-report-api.sh
```

## Features

1. **Dynamic Generation**: Reports are generated on-demand, no pre-generated files
2. **Multilingual Support**: 10 languages supported with easy extensibility
3. **Real Educational Links**: Automatic mapping to actual learning resources
4. **Language Switching**: In-report language selector redirects to new language version
5. **Toggle for Issues**: Low/medium priority issues can be hidden/shown
6. **Clean Templates**: No complex Handlebars conditionals, simple replacements

## Adding a New Language

1. Create translation file: `src/templates/modular/languages/[lang].json`
2. Add language to `AVAILABLE_LANGUAGES` in `generate-report.ts`
3. Update language dropdown in `simple-template.html`

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Client    │────▶│   API       │────▶│  Template    │
│  (Browser)  │     │  Endpoint   │     │  Processor   │
└─────────────┘     └─────────────┘     └──────────────┘
                            │                     │
                            ▼                     ▼
                    ┌─────────────┐     ┌──────────────┐
                    │   Report    │     │ Translations │
                    │   Storage   │     │   (JSON)     │
                    └─────────────┘     └──────────────┘
```

## Maintenance

- Templates: `src/templates/modular/`
- Translations: `src/templates/modular/languages/`
- Styles: `src/templates/modular/assets/styles.css`
- Scripts: `src/templates/modular/assets/scripts.js`
- API Endpoint: `src/routes/generate-report.ts`