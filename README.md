# VisualFlow AI — Shopify Embedded App (Frontend)

VisualFlow AI is a Shopify-embedded application that helps Indian D2C merchants automate their social media and ad content — from product-to-post generation to campaign tracking — directly inside the Shopify Admin.

This repository contains the **production frontend** for VisualFlow AI: a fast, mobile-first, type-safe React application built to run seamlessly inside the Shopify Admin iframe.

---

## 🚀 Overview

| | |
|---|---|
| **Product** | VisualFlow AI — AI-powered content & ad automation for Shopify merchants |
| **Market** | India-first (INR pricing, IST timezone, Hindi/English bilingual support) |
| **Platform** | Shopify Embedded App (runs inside Shopify Admin) |
| **Auth** | Shopify App Bridge session tokens — no separate login/signup flow |
| **Design** | Mobile-first — optimized for merchants managing their store on the go |

---

## ✨ Key Features

- **Onboarding Flow** — guided store setup for first-time merchants
- **Dashboard** — at-a-glance overview of store activity and performance
- **Product Catalog** — browse products and generate content directly from product data
- **Content Calendar** — plan and schedule posts across platforms
- **Ad Manager** — create and manage ad campaigns
- **Approval Queue** — review and approve AI-generated content before publishing
- **Published Posts** — track everything that's gone live
- **Competitor Monitor** — keep tabs on competitor activity
- **Analytics & Reports** — performance insights with exportable reports
- **WhatsApp Export** — share content directly via WhatsApp
- **Activity Log** — full audit trail of actions within the app

---

## 🛠️ Tech Stack

Built with a modern, production-grade React stack chosen for performance, type safety, and long-term maintainability:

- **React 18** + **TypeScript** (strict mode)
- **Vite** — fast builds and instant dev feedback
- **React Router v6** — client-side routing
- **TanStack Query** — server-state management & caching
- **Zustand** — lightweight global state management
- **React Hook Form + Zod** — type-safe forms with schema validation
- **Tailwind CSS** — utility-first, fully responsive styling
- **Radix UI** — accessible, unstyled component primitives
- **Framer Motion** — smooth, purposeful animation
- **Shopify App Bridge** — native embedded-app integration
- **Axios** — API communication layer

---

## 📱 Mobile-First by Design

Shopify merchants frequently manage their stores from mobile devices. This app is engineered accordingly:

- Designed from 375px up, tested across mobile, tablet, and desktop breakpoints
- 44px minimum touch targets throughout
- No hover-dependent interactions
- Safe-area handling for notches and home indicators

---

## 🏗️ Engineering Standards

This codebase follows strict internal engineering standards to ensure consistency, reliability, and maintainability:

- **Strict TypeScript** — no `any`, fully typed props, hooks, and API responses
- **Clear separation of state** — server state (TanStack Query), global state (Zustand), and local state (`useState`) are never mixed
- **Consistent data states** — every data-driven view handles loading, error, empty, and success states with dedicated components
- **Reusable design system** — a centralized `@ui` component library with a custom branded design language
- **Type-safe forms** — every form is built with React Hook Form and validated with shared Zod schemas
- **Centralized API layer** — all network requests go through a typed service layer, with automatic Shopify session-token handling

---

## 🔒 Security & Auth

- No custom authentication — identity is fully delegated to Shopify via App Bridge session tokens
- Session tokens are refreshed automatically to keep the embedded app secure and authenticated at all times
- No sensitive credentials are stored client-side

---

## 📂 Project Structure (High Level)

```
src/
├── components/     # Shared UI, layout, and design-system components
├── pages/          # Route-level pages (Dashboard, Products, Analytics, etc.)
├── hooks/          # Custom React hooks
├── services/       # Typed API service layer
├── store/          # Zustand global stores
├── providers/      # App-level context providers
├── validators/      # Zod schemas
├── utils/          # Shared utility functions
└── types/          # Shared TypeScript types
```

---

## 👤 About the Developer

This project is developed and maintained by **[FabCode](https://thefabcode.org)** — a development team specializing in building production-grade Shopify apps, SaaS platforms, and full-stack web applications.

Available for freelance and contract work on Upwork. Feel free to reach out to discuss your Shopify app, React/TypeScript, or full-stack development needs.

---

## 📄 License

This project is proprietary software. All rights reserved. See [LICENSE](./LICENSE) for details.
