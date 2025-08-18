# CodeQual Design System
**Created**: 2025-08-17
**Last Updated**: 2025-08-17

## Color Palette - "Ocean Depth"

### Light Mode Colors
```css
/* Primary Colors */
--primary: #0A4D4A;        /* Deep teal - main brand color */
--primary-light: #0F6B67;  /* Hover states */
--primary-dark: #063833;   /* Active states */

/* Secondary & Accent */
--secondary: #2CA58D;      /* Bright teal - success, growth */
--accent: #FF6B6B;         /* Coral - CTAs, important actions */
--accent-hover: #FF5252;   /* Darker coral for hover */

/* Semantic Colors */
--success: #2CA58D;        /* Same as secondary */
--warning: #F59E0B;        /* Amber */
--danger: #EF4444;         /* Clear red */
--info: #06B6D4;          /* Cyan - complements teal */

/* Neutrals */
--neutral-950: #020617;    /* Near black */
--neutral-900: #0F172A;    
--neutral-800: #1E293B;
--neutral-700: #334155;
--neutral-600: #475569;
--neutral-500: #64748B;
--neutral-400: #94A3B8;
--neutral-300: #CBD5E1;
--neutral-200: #E2E8F0;
--neutral-100: #F1F5F9;
--neutral-50: #F8FAFC;

/* Backgrounds */
--background: #FFFFFF;
--surface: #F8FAFC;
--surface-elevated: #FFFFFF;
```

### Dark Mode Colors
```css
/* Primary Colors */
--primary: #2CA58D;        /* Brighter for dark mode */
--primary-light: #40D9B8;
--primary-dark: #0F6B67;

/* Keep accent same */
--accent: #FF6B6B;
--accent-hover: #FF5252;

/* Neutrals (inverted) */
--neutral-50: #020617;
--neutral-100: #0F172A;
--neutral-200: #1E293B;
--neutral-300: #334155;
--neutral-400: #475569;
--neutral-500: #64748B;
--neutral-600: #94A3B8;
--neutral-700: #CBD5E1;
--neutral-800: #E2E8F0;
--neutral-900: #F1F5F9;
--neutral-950: #F8FAFC;

/* Backgrounds */
--background: #0A0F14;
--surface: #0F172A;
--surface-elevated: #1E293B;
```

## Typography System
```css
--font-sans: Inter, system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', Monaco, monospace;

/* Scale */
--text-xs: 0.75rem;     /* 12px - labels */
--text-sm: 0.875rem;    /* 14px - body small */
--text-base: 1rem;      /* 16px - body default */
--text-lg: 1.125rem;    /* 18px - section headers */
--text-xl: 1.25rem;     /* 20px - page headers */
--text-2xl: 1.5rem;     /* 24px - major headers */
--text-3xl: 2rem;       /* 32px - hero text */

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.6;

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

## Spacing System
```css
/* 4px base unit */
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

## Border Radius
```css
--radius-sm: 4px;      /* Small elements */
--radius-md: 6px;      /* Buttons, inputs */
--radius-lg: 8px;      /* Cards */
--radius-xl: 12px;     /* Modals */
--radius-full: 9999px; /* Pills, badges */
```

## Shadows
```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);
--shadow-md: 0 2px 4px rgba(0, 0, 0, 0.12);
--shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.12);
--shadow-xl: 0 8px 12px rgba(0, 0, 0, 0.12);
```

## Animation Guidelines
```css
/* Timing */
--transition-fast: 150ms ease-out;
--transition-normal: 250ms ease-out;
--transition-slow: 350ms ease-out;

/* Allowed animations */
- Hover states: opacity or slight transform
- Loading: skeleton pulse or simple spinner
- Page transitions: fade only
- Progress bars: smooth fill
- Accordion/collapse: height transition
```

## Design Principles

### "Technical Elegance"
1. **Data-Forward**: Let the numbers and insights be the hero
2. **Breathing Room**: Generous whitespace, never cramped
3. **Subtle Depth**: Light shadows, no heavy borders
4. **Purposeful Color**: Color only for meaning, not decoration

### Visual Hierarchy
- Primary action: Solid coral button
- Secondary action: Outlined teal button
- Tertiary: Ghost button
- Destructive: Red outline

### Component Standards
- Cards: Subtle shadow with hover elevation
- Borders: 1px solid with neutral-200/300
- Focus states: 2px offset outline in primary color
- Maximum line length: 65ch for readability