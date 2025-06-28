# Lovable UI Development Prompts for CodeQual
**Created: June 28, 2025**  
**Purpose: Ready-to-use prompts for Lovable AI UI development**

## 1. Initial Project Setup Prompt

```
Create a modern, professional code quality analysis dashboard for CodeQual. 

Key requirements:
- React with TypeScript and Tailwind CSS
- Dark mode support with system preference detection
- Responsive design (mobile-first)
- Purple gradient brand colors (#667eea to #764ba2)
- Clean, card-based layout with generous white space

The main dashboard should display:
1. Overall quality score (0-100) with large, prominent display
2. Category breakdowns (Security, Performance, Architecture, Code Quality, Dependencies, Testing)
3. Repository health indicators
4. Recent PR analyses list

Use modern UI patterns like:
- Smooth transitions and micro-animations
- Skeleton loaders during data fetching
- Toast notifications for actions
- Collapsible sections for detailed information
```

## 2. Analysis Report Page Prompt

```
Design a comprehensive PR analysis report page that shows:

Header Section:
- Repository name and PR title
- Overall score with color-coded background (gradient for high scores)
- Recommendation badge (APPROVE/NEEDS WORK/etc)
- Analysis metadata (timestamp, execution time)

Repository Health Banner:
- Light red background (#fee2e2)
- "23 unresolved repository issues" with breakdown by category
- Collapsible to show detailed issues
- Each issue shows: severity, message, file location, first detected date

PR Findings Section:
- 6 category cards in a responsive grid
- Each card shows: category icon, score (0-100), status, finding count
- Cards are clickable to expand and show detailed findings
- Findings grouped by severity with color-coded borders

Visual Design:
- Use shadows for depth (0 2px 10px rgba(0,0,0,0.05))
- Smooth hover effects on interactive elements
- Consistent spacing using Tailwind's spacing scale
- System font stack for optimal readability
```

## 3. Educational Recommendations Component

```
Create an educational recommendations component that displays:

Layout:
- Validated education section with white background
- Statistics dashboard showing URL validation results
- Priority-ordered learning topics (limit to 5)
- Visual indicators for top 2 priorities (star icon, featured styling)

Each Learning Topic Card:
- Title with priority badge (IMMEDIATE/HIGH/MEDIUM/LOW)
- Description of what will be learned
- Attribution showing why it matters (X PR findings, Y repo issues)
- Resource list with:
  - Resource type badges (guide/example/critical)
  - Clickable links that open in new tabs
  - "Auto-corrected from broken link" notices where applicable
  - Code examples with syntax highlighting

Interactive Features:
- Expand/collapse for resource details
- Copy button for code examples
- Progress tracking checkboxes for exercises
- Bookmark/save for later functionality
```

## 4. Skill Progression Visualization

```
Design a skill progression tracking component:

Chart Section:
- Line graph showing skill improvement over 3 months
- Multiple skills on same chart with different colors
- Interactive tooltips showing exact values
- Legend with current skill levels

Skill Cards Grid:
- Card for each skill showing:
  - Skill name and icon
  - Current level (X/10)
  - Trend arrow (↑ +2 points)
  - Mini sparkline
  - Color coding (green for improving, red for declining)

Achievement Badges:
- Visual rewards for skill improvements
- "Memory Management Master" for reaching level 8
- "Documentation Champion" for consistent improvement
- Shareable achievement cards
```

## 5. Component Library Structure

```
Create these reusable components:

1. ScoreDisplay
   - Props: score (0-100), size (sm/md/lg/xl), showTrend
   - Color changes based on score ranges
   - Optional trend arrow

2. CategoryCard  
   - Props: category, score, findings[], expanded
   - Collapsible with smooth animation
   - Icon for each category type

3. FindingItem
   - Props: severity, message, location, recommendation
   - Color-coded left border
   - Code location as clickable link

4. ResourceLink
   - Props: url, title, type, isValidated, isReplaced
   - Shows validation status
   - Opens in new tab with security attributes

5. PriorityBadge
   - Props: priority (immediate/high/medium/low)
   - Consistent color scheme
   - Pill-shaped design

6. CodeExample
   - Props: code, language, title
   - Syntax highlighting
   - Copy to clipboard button
   - Line numbers optional
```

## 6. Mobile-Responsive Layouts

```
Optimize for mobile devices:

Phone (< 640px):
- Stack all cards vertically
- Collapse category grid to single column
- Hide secondary information by default
- Larger touch targets (min 44px)
- Simplified navigation with hamburger menu

Tablet (640px - 1024px):
- 2-column grid for categories
- Side-by-side score comparisons
- Floating action buttons
- Optimized for portrait orientation

Desktop (> 1024px):
- 3-column grid for categories
- Sidebar navigation
- Sticky header while scrolling
- Hover states for additional info
- Keyboard shortcuts support
```

## 7. Interactive Dashboard Features

```
Add these interactive features to the main dashboard:

Filters and Search:
- Filter by category, severity, date range
- Search within findings
- Quick filters for "My PRs", "Team PRs", "Failed Checks"

Real-time Updates:
- Live progress bar during analysis
- WebSocket connection for status updates
- Animated transitions for score changes
- Toast notifications for completed analyses

Export Options:
- Download as PDF with formatting preserved
- Export JSON data for integration
- Copy markdown summary to clipboard
- Generate shareable link with expiry

Comparison View:
- Side-by-side PR comparison
- Diff view for score changes
- Highlight improvements vs regressions
- Timeline of changes
```

## 8. Theme and Styling System

```
Implement a comprehensive theming system:

Color Tokens:
--color-primary: #667eea
--color-primary-dark: #764ba2
--color-success: #28a745
--color-warning: #ffc107  
--color-error: #dc3545
--color-info: #17a2b8

Dark Mode:
- Automatic switching based on system
- Manual toggle in header
- Preserve syntax highlighting colors
- Adjusted shadows and borders
- Reduced contrast for eye comfort

Typography Scale:
- text-xs through text-6xl
- Consistent line heights
- Variable font weights
- Monospace for code sections
```

## 9. Error States and Loading

```
Design friendly error and loading states:

Loading States:
- Skeleton screens matching component shapes
- Pulsing animation for placeholders
- Progress indicators for long operations
- Estimated time remaining

Error States:
- Friendly error messages with solutions
- Retry buttons where applicable
- Contact support option
- Preserve user input on errors

Empty States:
- Illustrated placeholders
- Clear call-to-action buttons
- Helpful onboarding tips
- Sample data option for demos
```

## 10. Integration Widgets

```
Create embeddable widgets for external platforms:

PR Status Badge:
- Compact score display
- Click to view full report  
- Customizable size and style
- Auto-refresh on changes

Summary Widget:
- Key metrics in small card
- Fits in GitHub PR sidebar
- Real-time updates
- Expandable for details

README Badge:
- SVG format for compatibility
- Dynamic score updates
- Multiple style options
- Copy-paste embed code
```

## Tips for Using These Prompts

1. **Start Simple**: Begin with the main dashboard, then add complexity
2. **Iterate**: Use Lovable's preview to refine designs
3. **Component First**: Build reusable components before full pages
4. **Real Data**: Use the example JSON structures for realistic content
5. **Accessibility**: Mention WCAG compliance in prompts
6. **Performance**: Request lazy loading and code splitting
7. **Animations**: Ask for subtle, purposeful animations

## Example Conversation Flow with Lovable

1. Share the initial project setup prompt
2. Review the generated dashboard
3. Request specific adjustments (colors, spacing, etc.)
4. Move to the analysis report page
5. Add interactive features incrementally
6. Test responsive design at each step
7. Export production-ready code

Remember to save iterations and create branches for different design explorations!