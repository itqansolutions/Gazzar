# GX Fitness Academy — Public Website & Athlete Acquisition Plan

## Executive Summary
This document provides the implementation plan for the public-facing website, athlete subscription experience, and administrative content management system for GX Fitness Academy.

---

## 1. Risk Assessment for Concurrent Agent Work
- **Concurrent Agent Scope**: Another agent is actively modifying nutrition features (`src/app/nutrition/*`, `src/app/api/nutrition/*`, `src/app/api/nutrition-programs/*`, nutrition models in Prisma).
- **Protection Rules**:
  - ZERO edits to any nutrition files or endpoints.
  - In `prisma/schema.prisma`, strictly append our new models to the bottom of the file without altering existing model attributes or nutrition models.
  - In `CoachProfile`, safely add only the single reverse relation `publicProfile PublicCoachProfile?`.
  - In `AppShell.tsx`, strictly add public route bypass logic without touching role enforcement or authenticated navigation rules.
  - In `Sidebar.tsx`, add a dedicated "Public Website CMS" section for admin/head-coach without rearranging existing navigation links.

---

## 2. Existing Files to Modify
1. `src/components/layout/AppShell.tsx`
   - **Reason**: Enable unauthenticated public access for `/`. Bypass Navbar/Sidebar/BottomNav when unauthenticated on `/`. Redirect authenticated visitors from `/` to `/dashboard`.
2. `src/app/page.tsx`
   - **Reason**: Replace existing client redirect with high-performance Next.js 14 Server Component rendering the full branded landing page and performing server-side session redirection to `/dashboard` for logged-in athletes and coaches.
3. `src/app/layout.tsx`
   - **Reason**: Enhance base metadata with OpenGraph tags, proper brand title templates, and description.
4. `src/components/layout/Sidebar.tsx`
   - **Reason**: Add Public Content Management menu items for `ADMIN` and `HEAD_COACH` roles under an isolated CMS section.
5. `src/app/dashboard/page.tsx`
   - **Reason**: Integrate the new `SubscriptionCard` component into the athlete's dashboard section without touching existing KPI or chart blocks.
6. `prisma/schema.prisma`
   - **Reason**: Append new additive models: `PublicCoachProfile`, `PublicPackage`, `Championship`, `PublicOffer`, `AcademySetting`, `GalleryImage`.

---

## 3. New Files to Create

### Prisma & Seeding
- `scripts/seed-academy-settings.mjs` — Upsert default academy settings and sample public packages/offers.

### Public API Routes (No Auth Required)
- `src/app/api/public/sports/route.ts` — Active sports list with public caching headers.
- `src/app/api/public/coaches/route.ts` — Public coaches list with bios, specialties, and titles.
- `src/app/api/public/packages/route.ts` — Active membership packages with benefits and pricing.
- `src/app/api/public/championships/route.ts` — Published championship and tournament achievements.
- `src/app/api/public/offers/route.ts` — Active promotional discounts with expiry dates.
- `src/app/api/public/settings/route.ts` — Key-value academy settings (WhatsApp, socials, contact).

### Athlete Subscription API & Component
- `src/app/api/athlete/subscription/route.ts` — Authenticated endpoint returning athlete's current membership status, remaining days, and plan details.
- `src/components/dashboard/SubscriptionCard.tsx` — Athlete dashboard component with status badges and countdown.

### Public Landing Page Components (`src/components/public/`)
- `src/components/public/PublicNavbar.tsx` — Sticky header with GX logo, navigation links, theme toggle, and Login CTA.
- `src/components/public/HeroSection.tsx` — High-impact hero with brand typography, mission, and direct CTAs.
- `src/components/public/AboutSection.tsx` — Academy intro, stats counters, training philosophy.
- `src/components/public/SportsSection.tsx` — Grid of sports offered with visuals and action buttons.
- `src/components/public/ChampionshipsSection.tsx` — Trophy showcase, tournament records, and achievements.
- `src/components/public/CoachesSection.tsx` — Coach cards, specialties, and coaching experience.
- `src/components/public/PackagesSection.tsx` — Membership pricing tiers with WhatsApp pre-filled registration links.
- `src/components/public/OffersSection.tsx` — Seasonal promotions and limited-time discounts.
- `src/components/public/FooterSection.tsx` — Academy footer with links, socials, contact, and copyright.
- `src/components/public/FloatingWhatsApp.tsx` — Sticky floating WhatsApp action button with pulse animation.

### Admin Content Management Pages & APIs (`ADMIN` / `HEAD_COACH`)
- **Pages**:
  - `src/app/admin-public/page.tsx` — CMS dashboard overview.
  - `src/app/admin-public/packages/page.tsx` — Package management (CRUD).
  - `src/app/admin-public/championships/page.tsx` — Championship achievements management (CRUD).
  - `src/app/admin-public/offers/page.tsx` — Promotional offers management (CRUD).
  - `src/app/admin-public/coaches/page.tsx` — Coach public profile visibility & details.
  - `src/app/admin-public/settings/page.tsx` — Academy settings editor (WhatsApp, socials, about).
  - `src/app/admin-public/gallery/page.tsx` — Gallery images manager.
- **Admin APIs**:
  - `src/app/api/admin-public/packages/route.ts` & `[id]/route.ts`
  - `src/app/api/admin-public/championships/route.ts` & `[id]/route.ts`
  - `src/app/api/admin-public/offers/route.ts` & `[id]/route.ts`
  - `src/app/api/admin-public/coaches/route.ts` & `[id]/route.ts`
  - `src/app/api/admin-public/settings/route.ts`
  - `src/app/api/admin-public/gallery/route.ts` & `[id]/route.ts`

---

## 4. Execution Sequence
1. Update `prisma/schema.prisma` with safe additive models.
2. Run database migration (`prisma migrate dev`) and regenerate client (`prisma generate`).
3. Seed default academy settings via `scripts/seed-academy-settings.mjs`.
4. Modify `AppShell.tsx` to handle public `/` route.
5. Create all public API routes under `src/app/api/public/*`.
6. Implement public landing page sections in `src/components/public/*` and wire up `src/app/page.tsx` with server-side auth checking.
7. Implement athlete subscription endpoint (`/api/athlete/subscription`) and dashboard card (`SubscriptionCard.tsx`), integrate into `dashboard/page.tsx`.
8. Implement admin CMS API routes and UI pages under `src/app/admin-public/*` and update `Sidebar.tsx`.
9. Update SEO metadata in `layout.tsx` and `page.tsx`.
10. Run TypeScript verification (`npx tsc --noEmit`) and production build (`npx next build`).
11. Generate completion report at `docs/public-website-completion-report.md`.
