# VisualFlow AI — Frontend

## What This Is
Production React + TypeScript frontend. Shopify embedded app.
Runs inside Shopify Admin iframe on both desktop and mobile.
NO custom login. NO register. NO JWT.
Auth = Shopify App Bridge session tokens.
India-only product. INR pricing. Hindi/English bilingual.

## Stack
React 18 · TypeScript (strict) · React Router v6 · Vite
Tailwind CSS · Zustand · TanStack Query · React Hook Form
Zod · Framer Motion · Radix UI · Shopify App Bridge · Axios

## Path Aliases (always use these, never relative imports for cross-folder)
@/* → src/*
@ui/* → src/components/ui/*
@pages/* → src/pages/*
@hooks/* → src/hooks/*
@services/* → src/services/*
@store/* → src/store/*
@types/* → src/types/*
@utils/* → src/utils/*
@validators/* → src/validators/*

## Port
Frontend: http://localhost:5173
Backend: http://localhost:5000 (proxied via /api)

## Mobile-First — Non-Negotiable
Shopify merchants use this app on mobile constantly.
- Design for 375px first, scale up
- Touch targets minimum 44px height
- No hover-only interactions
- Tap-friendly spacing (minimum 8px between tappable elements)
- Use safe-bottom and safe-top utility classes for notch/home indicator
- Test every page at xs(375px), sm(640px), md(768px), lg(1024px)

## Shopify Embedded App Rules
- App runs inside Shopify Admin iframe
- NEVER use window.top or parent frame navigation
- host URL param must always reach AppBridgeProvider
- Session tokens expire every 60 seconds — always get fresh
- api.ts handles token attachment automatically
- If 401 from backend → reload app (token issue)
- NO /login /register routes — Shopify handles identity

## State — 3 Layers, Never Mix
1. SERVER STATE → TanStack Query (useQuery, useMutation)
2. GLOBAL CLIENT STATE → Zustand (shopStore, uiStore)
3. LOCAL STATE → useState (component-only)

Rule: API data = React Query. Shared UI state = Zustand. 
Temporary local state = useState.

## TypeScript Rules
- strict: true always — no exceptions
- No `any` — use `unknown` and narrow, or proper types
- All component props have explicit interfaces
- All hook return values typed
- All service functions return typed Promise<T>
- Run npm run typecheck before considering any task done

## Component Rules — 4 States Always
Every component that fetches data MUST handle:
1. isLoading → page-specific Skeleton (NEVER a spinner for page load)
2. isError → ErrorState component
3. isEmpty → EmptyState component
4. data → real content

Skeletons must match the exact layout of real content.
Use branded violet shimmer — never gray shimmer.

## Design System Rules
- cn() from @utils/cn for ALL className construction
- All interactive elements use components from @ui — never raw HTML
- Tailwind tokens only — no hardcoded colors, no inline styles
- Spacing from Tailwind scale only
- font-display class for headings, default sans for body

## Form Rules
- React Hook Form + Zod always
- mode: 'onBlur' — never 'onChange'
- Shared Zod schemas from @validators/schemas.ts
- Disable submit while isSubmitting
- Show field errors below Input using errors object
- Toast success/error on every mutation

## API Rules
- NEVER axios directly in components
- ALL calls through @services/ using React Query
- api.ts handles session token automatically
- All services return typed Promise<T>
- Query keys include all relevant filter params

## India-Specific Rules
- formatINR() for ALL price display — never raw numbers
- IST timezone for all dates (dateUtils.ts)
- Support English / Hindi / Bilingual content modes
- Minimum touch target 44px for mobile Indian users

## New Page Checklist
- [ ] Route added in App.tsx
- [ ] Skeleton in components/skeletons/ matching real layout
- [ ] All 4 states (loading/error/empty/data)
- [ ] Forms use RHF + Zod + typed schema
- [ ] API via React Query + services/
- [ ] Mutations show isSubmitting on button
- [ ] Success + error toasts
- [ ] document.title updated
- [ ] Mobile responsive (375px minimum)
- [ ] npm run typecheck passes

## New Component Checklist
- [ ] Props interface defined (not inline)
- [ ] cn() used for className
- [ ] Mobile touch targets 44px minimum
- [ ] Loading/disabled states handled
- [ ] Exported from index.ts if ui/ component
