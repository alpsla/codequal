# CodeQual Visual Design Specifications
**Created: June 28, 2025**  
**Purpose: Design system reference for UI development**

## 1. Color Palette

### Primary Colors
```css
/* Brand Gradient */
--gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--color-primary: #667eea;
--color-primary-dark: #764ba2;
```

### Status Colors
```css
/* Semantic Colors */
--color-success: #28a745;
--color-warning: #ffc107;
--color-danger: #dc3545;
--color-info: #17a2b8;

/* Score-based Colors */
--score-excellent: #28a745;  /* 90-100 */
--score-good: #17a2b8;       /* 70-89 */
--score-fair: #ffc107;       /* 50-69 */
--score-poor: #dc3545;       /* 0-49 */
```

### Neutral Colors
```css
/* Grays */
--gray-50: #f8f9fa;
--gray-100: #f3f4f6;
--gray-200: #e9ecef;
--gray-300: #dee2e6;
--gray-400: #ced4da;
--gray-500: #adb5bd;
--gray-600: #6c757d;
--gray-700: #495057;
--gray-800: #343a40;
--gray-900: #212529;
```

### Special Purpose
```css
/* Backgrounds */
--bg-repo-issues: #fee2e2;     /* Light red for repo issues */
--bg-feature: #f0f4ff;         /* Light purple for featured items */
--bg-replaced: #eff6ff;        /* Light blue for replaced URLs */
--bg-code: #1e293b;           /* Dark for code blocks */
```

## 2. Typography

### Font Stack
```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: 'Monaco', 'Consolas', 'Courier New', monospace;
```

### Size Scale
```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
--text-5xl: 3rem;      /* 48px */
--text-6xl: 4rem;      /* 64px */
```

### Line Heights
```css
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.6;
--leading-loose: 2;
```

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

## 3. Spacing System

### Base Scale
```css
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;    /* 20px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
```

## 4. Component Styles

### Cards
```css
.card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

### Buttons
```css
.button {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;
}

.button-primary {
  background: var(--gradient-primary);
  color: white;
}

.button-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
```

### Badges
```css
.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.priority-immediate { background: #fee2e2; color: #dc2626; }
.priority-high { background: #fef3c7; color: #d97706; }
.priority-medium { background: #dbeafe; color: #2563eb; }
.priority-low { background: #d1fae5; color: #065f46; }
```

### Score Display
```css
.score-display {
  font-size: 72px;
  font-weight: bold;
  display: flex;
  align-items: baseline;
}

.score-display small {
  font-size: 24px;
  margin-left: 5px;
}
```

## 5. Layout Patterns

### Container
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
```

### Grid Systems
```css
/* Category Grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

/* Stats Grid */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}
```

## 6. Interactive States

### Hover Effects
```css
/* Links */
a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: var(--color-primary-dark);
  text-decoration: underline;
}

/* Clickable Cards */
.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.clickable:hover {
  transform: scale(1.02);
}
```

### Focus States
```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

## 7. Animations

### Transitions
```css
/* Default transition */
.transition {
  transition: all 0.2s ease;
}

/* Smooth collapse */
.collapse {
  transition: height 0.3s ease-out, opacity 0.3s ease-out;
}
```

### Loading States
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton {
  animation: pulse 2s infinite;
  background: var(--gray-200);
  border-radius: 4px;
}
```

## 8. Responsive Breakpoints

```css
/* Mobile First */
--screen-sm: 640px;   /* Small tablets */
--screen-md: 768px;   /* Tablets */
--screen-lg: 1024px;  /* Desktop */
--screen-xl: 1280px;  /* Large desktop */
--screen-2xl: 1536px; /* Extra large */
```

## 9. Shadow System

```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
--shadow-md: 0 2px 10px rgba(0, 0, 0, 0.05);
--shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 40px rgba(0, 0, 0, 0.15);
```

## 10. Dark Mode Adjustments

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2d2d2d;
    --text-primary: #e2e8f0;
    --text-secondary: #a0aec0;
    
    /* Adjusted shadows */
    --shadow-md: 0 2px 10px rgba(0, 0, 0, 0.3);
    
    /* Code highlighting preserved */
    --bg-code: #1e293b;
  }
  
  .card {
    background: var(--bg-secondary);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}
```

## 11. Icon Requirements

### Category Icons
- Security: Shield icon
- Performance: Lightning bolt
- Architecture: Building/Structure
- Code Quality: Sparkles/Stars
- Dependencies: Package/Box
- Testing: Checkmark in circle

### Status Icons
- Success: ✓ Checkmark
- Warning: ⚠️ Triangle
- Error: ✕ X mark
- Info: ℹ️ Info circle

### Action Icons
- Expand/Collapse: Chevron down/up
- External link: Arrow pointing out
- Copy: Two overlapping squares
- Download: Arrow pointing down
- Share: Three connected dots

## 12. Accessibility Specifications

### Contrast Ratios
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

### Focus Indicators
- Visible focus ring on all interactive elements
- Skip navigation links
- Proper heading hierarchy

### ARIA Labels
- Descriptive labels for icons
- Live regions for dynamic content
- Proper role attributes

## Usage in Lovable

When creating prompts for Lovable, reference these specifications:
- "Use the CodeQual purple gradient (#667eea to #764ba2)"
- "Apply standard card styling with 12px border radius and subtle shadow"
- "Follow the 4px spacing scale (0.25rem increments)"
- "Implement hover states with translateY(-2px) transform"
- "Use system font stack for optimal performance"

This design system ensures consistency across all UI components while maintaining the professional, modern aesthetic that CodeQual represents.