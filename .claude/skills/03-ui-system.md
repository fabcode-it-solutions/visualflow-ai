# UI Design System — visualflow_frontend

## Colors (Tailwind tokens — never hardcode hex)

Brand (violet): brand-50 through brand-950
Accent (amber): accent-50 through accent-900
Surface (neutral): surface-0, surface-50, surface-100, surface-200, surface-300

Usage:
- Primary actions: bg-brand-600, hover:bg-brand-700
- Active states: bg-brand-50 text-brand-700 border-brand-200
- Warning: accent-500/600
- Page background: bg-surface-50
- Card background: bg-surface-0
- Borders: border-surface-200 or border-surface-300 (stronger)

## Typography

Headings → font-display font-semibold or font-bold
Body → default (Inter, no class needed)
Muted → text-zinc-500
Caption → text-xs text-zinc-400

Size scale for mobile-first:
- Page title: text-xl md:text-2xl font-display font-bold
- Section title: text-base md:text-lg font-display font-semibold
- Card title: text-sm font-semibold
- Body: text-sm
- Caption: text-xs

## Spacing (mobile-first)

Page padding: px-4 py-4 md:px-6 md:py-6
Card padding: p-4 md:p-5
Section gap: space-y-4 md:space-y-6
Grid gap: gap-3 md:gap-4

## Shadows
- Card: shadow-card
- Floating/elevated: shadow-elevated
- Modal: shadow-modal

## Touch Targets (mobile — critical)
- All buttons: min-h-[44px]
- All inputs: min-h-[44px]
- All list items that are tappable: min-h-[48px]
- Icon-only buttons: min-w-[44px] min-h-[44px]

## Skeleton — Branded Shimmer

```tsx
// Correct shimmer style
<div className="animate-shimmer bg-gradient-to-r 
  from-brand-100 via-brand-50 to-brand-100 
  bg-[length:200%_100%] rounded-lg" 
  style={{ height: '20px', width: '60%' }} 
/>
```

## cn() Usage

```tsx
import { cn } from '@utils/cn'

// Conditional classes
cn('base-class', isActive && 'active-class', className)

// Variant pattern
cn(
  'base',
  variant === 'primary' && 'bg-brand-600 text-white',
  variant === 'secondary' && 'bg-surface-100 text-zinc-700',
  size === 'sm' && 'text-sm px-3 py-1.5',
  size === 'md' && 'text-sm px-4 py-2.5',
)
```

## Responsive Breakpoints (mobile-first always)

xs: 375px — default (write base styles for this)
sm: 640px — larger phones
md: 768px — tablets
lg: 1024px — desktop
xl: 1280px — wide desktop

Pattern: `text-sm md:text-base` (not the reverse)
