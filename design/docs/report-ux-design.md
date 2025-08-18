# Report UX Design Specifications
**Created**: 2025-08-17
**Last Updated**: 2025-08-17

## Report Navigation Pattern: Progressive Disclosure

### Overview Structure
The report uses a drill-down navigation pattern with three levels of detail:

1. **Summary Level** - Quick overview with scores
2. **Category Level** - Detailed findings per dimension  
3. **Issue Level** - Specific code problems and fixes

### Navigation Flow

```
Summary Dashboard (All 6 Categories)
    ↓ Click on category card
Category Detail View (e.g., Security)
    ↓ Click on specific issue
Issue Detail Modal/Panel
    ↑ Back to category or close
```

### Summary Dashboard Layout

```
┌─────────────────────────────────────────┐
│ PR #1234 Analysis | 85/100 | APPROVED ✅ │
├─────────────────────────────────────────┤
│                                         │
│  [6 Category Cards in 2x3 Grid]        │
│                                         │
│  Each card shows:                       │
│  - Icon & Category name                │
│  - Score with delta (↑3, ↓2, →0)      │
│  - One-line summary                    │
│  - Issue count if any                  │
│                                         │
└─────────────────────────────────────────┘
```

### Category Card States

**Default State:**
- White background (light mode)
- 1px border in neutral-200
- Subtle shadow

**Hover State:**
- Slight elevation (translateY(-2px))
- Enhanced shadow
- Cursor pointer

**Score Indicators:**
- Excellent (90-100): Green accent border
- Good (70-89): Blue accent border  
- Fair (50-69): Yellow accent border
- Poor (0-49): Red accent border

### Category Detail View

**Option A: Slide-out Panel (Recommended)**
- Slides in from right
- Preserves summary context on left
- 60% width on desktop, full on mobile
- Smooth transition (250ms)

**Option B: In-page Expansion**
- Other cards fade/minimize
- Selected category expands in place
- Breadcrumb navigation appears

### Mobile Considerations

**Summary View:**
- Stack cards vertically
- Larger touch targets (min 44px)
- Swipe between categories

**Detail View:**
- Full screen takeover
- Fixed header with back button
- Scrollable content area
- Bottom sheet for actions

### Interaction Details

**Desktop:**
- Click to drill down
- ESC key to go back
- Breadcrumb navigation
- Keyboard arrow keys for navigation

**Mobile:**
- Tap to drill down
- Swipe right to go back
- Fixed back button
- Pull-to-refresh for updates

### Loading States

**Initial Load:**
- Skeleton cards with pulsing animation
- Load categories as they complete

**Drill-down Load:**
- Keep summary visible
- Show loading spinner in panel
- Fade in content when ready

### Data Density Guidelines

**Summary Level:**
- Maximum 3 lines of text per card
- Only essential metrics
- Visual indicators over text

**Category Level:**
- 2-3 sentence overview
- Bulleted issue list
- Expand/collapse for details

**Issue Level:**
- Full code snippets
- Detailed explanations
- Step-by-step fixes

### Implementation with shadcn-ui

```tsx
// Summary Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {categories.map(category => (
    <Card 
      className="cursor-pointer hover:-translate-y-0.5 transition-transform"
      onClick={() => setSelectedCategory(category)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{category.icon}</span>
            <h3 className="font-semibold">{category.name}</h3>
          </div>
          <Badge variant={getScoreVariant(category.score)}>
            {category.score}
            {category.delta !== 0 && (
              <span className="ml-1">
                {category.delta > 0 ? `↑${category.delta}` : `↓${Math.abs(category.delta)}`}
              </span>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {category.summary}
        </p>
        {category.issueCount > 0 && (
          <p className="text-sm mt-2 text-warning">
            {category.issueCount} issue{category.issueCount > 1 ? 's' : ''} found
          </p>
        )}
      </CardContent>
    </Card>
  ))}
</div>

// Slide-out Panel
<Sheet open={!!selectedCategory} onOpenChange={setSelectedCategory}>
  <SheetContent className="w-full md:w-3/5 overflow-y-auto">
    <SheetHeader>
      <SheetTitle>{selectedCategory?.name} Analysis</SheetTitle>
      <SheetDescription>
        Score: {selectedCategory?.score}/100
      </SheetDescription>
    </SheetHeader>
    <div className="mt-6">
      {/* Category details */}
    </div>
  </SheetContent>
</Sheet>
```

This approach provides:
- Clear information hierarchy
- Minimal cognitive load
- Smooth navigation
- Mobile-friendly interactions
- Consistent with minimalist design goals