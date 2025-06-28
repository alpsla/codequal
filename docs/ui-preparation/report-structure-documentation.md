# CodeQual Report Structure Documentation
**Created: June 28, 2025**  
**Purpose: Foundation for UI/UX Development with Lovable**

## Overview
This document captures the current report structure, data schemas, and content organization of CodeQual's analysis reports. It serves as the foundation for UI/UX development using Lovable.

## 1. Report Types and Their Purposes

### 1.1 Main Analysis Report
**Purpose**: Comprehensive PR analysis with repository context  
**File**: `codequal-analysis-report.html`  
**Key Sections**:
- Header with overall score and recommendation
- Repository health banner (pending issues)
- PR-specific findings by category
- Educational recommendations
- Skill progression tracking

### 1.2 Educational Report
**Purpose**: Targeted learning recommendations based on findings  
**File**: `validated-education-report.html`  
**Key Features**:
- URL validation statistics
- Prioritized learning topics
- Resource links with validation status
- Immediate action items

## 2. Data Structures

### 2.1 Analysis Results Schema
```javascript
{
  metadata: {
    analysisId: string,
    repository: string,
    prNumber: number,
    title: string,
    author: string,
    timestamp: string,
    executionTime: number,
    analysisDepth: string,
    agentsUsed: number
  },
  summary: {
    overallScore: number (0-100),
    recommendation: "APPROVE" | "APPROVE WITH MINOR SUGGESTIONS" | "NEEDS WORK" | "REJECT",
    issuesAddressed: number,
    newFindings: number,
    skillImprovements: number
  },
  categoryAnalysis: {
    [category]: {
      score: number (0-100),
      status: "Perfect" | "Excellent" | "Good" | "Fair" | "Poor",
      findings: Finding[],
      insights: string[],
      measurements?: object
    }
  },
  repositoryImpact: {
    pendingIssues: {
      total: number,
      byCategory: { [category]: number },
      detailsByCategory: { [category]: Issue[] }
    },
    issuesResolved: string[],
    healthTrend: "Improving" | "Stable" | "Declining"
  },
  skillDevelopment: {
    improvements: SkillImprovement[],
    learningPath: LearningRecommendation[],
    nextChallenges: string[]
  }
}
```

### 2.2 Categories
- **Security**: XSS, CSRF, authentication, authorization
- **Performance**: Memory leaks, bundle size, optimization
- **Architecture**: Coupling, patterns, modularity
- **Code Quality**: Documentation, naming, complexity
- **Dependencies**: Updates, vulnerabilities, licensing
- **Testing**: Coverage, patterns, edge cases

### 2.3 Finding Structure
```javascript
{
  severity: "high" | "medium" | "low",
  type: string,
  message: string,
  location?: string,
  recommendation: string,
  context?: string
}
```

## 3. Visual Components

### 3.1 Score Display Components
- **Overall Score**: Large numeric display (0-100) with color coding
- **Category Scores**: Smaller score cards with status badges
- **Trend Indicators**: Arrows showing improvement/decline
- **Progress Bars**: Visual representation of scores

### 3.2 Content Organization
- **Collapsible Sections**: For detailed issue lists
- **Priority Badges**: IMMEDIATE, HIGH, MEDIUM, LOW
- **Status Indicators**: Color-coded severity levels
- **Attribution Tags**: "PR Finding" vs "Repository Issue"

### 3.3 Interactive Elements
- **Expand/Collapse**: For category details
- **Code Examples**: Syntax-highlighted blocks
- **External Links**: Validated educational resources
- **Copy Buttons**: For code snippets

## 4. User Workflows

### 4.1 Analysis Review Flow
1. View overall score and recommendation
2. Check repository health status
3. Review PR-specific findings by category
4. Examine detailed issues (expand sections)
5. Access educational recommendations
6. Track skill progression

### 4.2 Educational Flow
1. See prioritized learning topics
2. Understand why (PR findings vs repo issues)
3. Access validated resources
4. View code examples
5. Get immediate action items

## 5. Content Hierarchy

### 5.1 Information Priority
1. **Critical**: Security vulnerabilities, breaking changes
2. **Important**: Performance issues, architectural concerns
3. **Moderate**: Code quality, best practices
4. **Low**: Style issues, minor improvements

### 5.2 Visual Hierarchy
- **Primary**: Overall score, recommendation
- **Secondary**: Category scores, key findings
- **Tertiary**: Detailed explanations, code examples
- **Supporting**: Links, metadata, timestamps

## 6. Design Patterns That Work

### 6.1 Effective Patterns
- **Gradient Headers**: Visual appeal and brand identity
- **Card-Based Layout**: Clear content separation
- **Color Coding**: Consistent severity/status indication
- **Progressive Disclosure**: Collapsible detailed content
- **Contextual Help**: Inline explanations

### 6.2 Typography and Spacing
- **Headers**: Clear hierarchy (h1-h4)
- **Body Text**: Readable line height (1.6)
- **Code**: Monospace with syntax highlighting
- **Spacing**: Generous padding for readability

## 7. API and Data Flow

### 7.1 API Endpoints
```
POST /api/analyze-pr
GET  /api/analysis/:id/progress
GET  /api/analysis/:id/results
POST /api/educational/recommendations
GET  /api/repository/:id/health
```

### 7.2 Real-time Updates
- Progress tracking during analysis
- Live status updates
- Streaming results as available

## 8. Key Features for UI

### 8.1 Must-Have Features
- **Responsive Design**: Mobile to desktop
- **Dark Mode**: Developer preference
- **Export Options**: PDF, JSON, Markdown
- **Shareable Links**: For team collaboration
- **Search/Filter**: Within findings
- **Comparison View**: Before/after changes

### 8.2 Nice-to-Have Features
- **Annotations**: User comments on findings
- **History View**: Past analyses
- **Trends Dashboard**: Repository health over time
- **Team Analytics**: Developer skill progression
- **Integration Widgets**: For GitHub/GitLab

## 9. Accessibility Requirements

### 9.1 Standards
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators

### 9.2 Performance
- Fast initial load (< 2s)
- Smooth interactions
- Optimized images
- Lazy loading for details

## 10. Branding Guidelines

### 10.1 CodeQual Identity
- **Primary Colors**: Purple gradient (#667eea to #764ba2)
- **Status Colors**: 
  - Success: #28a745
  - Warning: #ffc107
  - Error: #dc3545
  - Info: #17a2b8
- **Typography**: System fonts for performance
- **Logo**: CodeQual with quality badge

### 10.2 Tone and Voice
- Professional but approachable
- Clear and concise
- Educational not condescending
- Encouraging improvement

## 11. Content Templates

### 11.1 Recommendation Messages
- **APPROVE**: "Excellent work! This PR maintains high code quality standards."
- **APPROVE WITH SUGGESTIONS**: "Good PR with minor improvement opportunities."
- **NEEDS WORK**: "Several issues need attention before merging."
- **REJECT**: "Critical issues must be resolved before proceeding."

### 11.2 Educational Introductions
- "Based on X PR findings and Y repository issues, we recommend focusing on:"
- "Your code shows improvement in [skill]. Keep building on this!"
- "Immediate actions to improve code quality:"

## 12. Integration Points

### 12.1 External Services
- GitHub/GitLab API for PR data
- OpenRouter for AI analysis
- Vector DB for repository context
- Monitoring services (Prometheus/Grafana)

### 12.2 Embeddable Components
- Summary widget for PR pages
- Score badge for README
- Progress tracker for dashboards

## 13. Example User Stories for UI

### 13.1 Developer Stories
- "As a developer, I want to quickly see if my PR will pass quality checks"
- "As a developer, I want specific guidance on fixing issues"
- "As a developer, I want to track my skill improvement over time"

### 13.2 Team Lead Stories
- "As a team lead, I want to see repository health trends"
- "As a team lead, I want to identify training needs"
- "As a team lead, I want to enforce quality standards"

## 14. Mockup Preparation Checklist

For Lovable UI development, prepare:
- [ ] Current HTML/CSS examples
- [ ] Color palette and gradients
- [ ] Icon requirements
- [ ] Component library needs
- [ ] Animation preferences
- [ ] Mobile-first considerations
- [ ] Dashboard layout concepts

## 15. Technical Constraints

### 15.1 Framework Preferences
- React/Next.js for consistency
- TypeScript for type safety
- Tailwind CSS for styling
- Chart.js for visualizations

### 15.2 Performance Budget
- Initial load: < 100KB
- Time to interactive: < 3s
- Lighthouse score: > 90

## Next Steps

1. **Create Visual Mockups**: Use this document to guide Lovable prompts
2. **Define Component Library**: Reusable UI components
3. **Design System**: Complete style guide
4. **Prototype Key Flows**: Interactive demos
5. **User Testing Plan**: Validate design decisions

---

This document should be updated as the UI development progresses and new requirements emerge.