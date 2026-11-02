# GX Academy – Master Action Plan & Remediation Roadmap

**Audit Date:** 2026-11-01  
**Auditor Role:** Senior Software Architect & Security Engineer  
**Document Purpose:** Prioritized, risk-mitigated execution roadmap for transforming GX Academy into a production-grade, secure, and visually stunning sports academy platform.

---

## 1. Overview & Strategy

This Master Action Plan is structured into **four sequential phases**. Tasks are arranged strictly by dependency and risk profile:
- **Phase 1: Immediate Triage & Security Lockdown (Days 1–2)**  
  *Eliminate critical information disclosure, backdoor passwords, and demo switchers.*
- **Phase 2: Visual Transformation & Design System Elevation (Days 3–5)**  
  *Unify color palette, fix dark/light theme clashes, standardize typography, and eliminate amateurish UI clutter.*
- **Phase 3: Database & Backend Architecture Realization (Days 6–10)**  
  *Connect Prisma ORM to real PostgreSQL, build authenticated Server Actions / API routes, and retire client-side localStorage.*
- **Phase 4: Component Refactoring & Production Hardening (Days 11–14)**  
  *Decompose giant monolithic page files, introduce server pagination, setup ESLint, and harden audit logging.*

---

## 2. Master Implementation Matrix

| ID | Task Name | Severity / Priority | Complexity | Dependencies | Primary Target Files |
|---|---|---|---|---|---|
| **T-01** | Purge Plaintext Admin Credentials & Sanitize Login Page | **CRITICAL (P0)** | LOW | None | `src/app/login/page.tsx` |
| **T-02** | Remove Universal Backdoor Passwords in Verification Logic | **CRITICAL (P0)** | LOW | None | `src/lib/auth.ts`, `src/context/AuthContext.tsx` |
| **T-03** | Eradicate Unauthenticated Role Impersonation in Login Route | **CRITICAL (P0)** | LOW | None | `src/app/api/auth/login/route.ts` |
| **T-04** | Remove Demo Role Switcher from Navbar & Shell | **HIGH (P0)** | LOW | None | `src/components/layout/Navbar.tsx` |
| **T-05** | Fix Theme Conflict & Establish Unified Athletic Design Palette | **HIGH (P1)** | MEDIUM | T-01, T-04 | `src/app/globals.css`, `src/context/ThemeContext.tsx`, `src/app/dashboard/page.tsx` |
| **T-06** | Sanitize Micro-Copy & Eliminate Emoji Clutter | **MEDIUM (P1)** | LOW | T-05 | `src/components/layout/Sidebar.tsx`, `src/components/layout/Navbar.tsx`, Page headers |
| **T-07** | Standardize Border Radii & Card Elevating Tokens | **MEDIUM (P1)** | MEDIUM | T-05 | All `page.tsx` files under `src/app/` |
| **T-08** | Implement Next.js Server Middleware for Route Protection | **HIGH (P1)** | MEDIUM | T-02, T-03 | `src/middleware.ts` (New file) |
| **T-09** | Wire PostgreSQL & Prisma to API Routes / Server Actions | **CRITICAL (P2)** | HIGH | T-08 | `src/lib/prisma.ts`, `src/app/api/*`, `prisma/seed.js` |
| **T-10** | Migrate Authentication to `httpOnly` Session Cookies | **HIGH (P2)** | MEDIUM | T-08, T-09 | `src/context/AuthContext.tsx`, `src/lib/auth.ts` |
| **T-11** | Decompose Giant Page Components into Modular Features | **MEDIUM (P3)** | HIGH | T-05, T-07 | `src/app/coaches/page.tsx`, `src/app/clients/page.tsx`, `src/app/programs/page.tsx` |
| **T-12** | Implement Server-Side Pagination & Search Filtering | **HIGH (P3)** | MEDIUM | T-09 | `src/app/clients/`, `src/app/exercises/`, `src/app/audit-logs/` |
| **T-13** | Persistent Database Audit Trail Engine | **MEDIUM (P3)** | MEDIUM | T-09 | `src/lib/audit.ts`, `src/app/audit-logs/` |
| **T-14** | Configure ESLint & Automated Quality Gate | **LOW (P4)** | LOW | None | `.eslintrc.json` (New file), `package.json` |

---

## 3. Detailed Phase Breakdown & Acceptance Criteria

### PHASE 1: Immediate Triage & Security Lockdown (Target: Within 24-48 Hours)

#### Task T-01: Purge Plaintext Admin Credentials & Sanitize Login Page
- **Action:**
  1. In [`src/app/login/page.tsx`](file:///d:/Gazzar%20Project/src/app/login/page.tsx), set initial `email` and `password` state to empty strings `""`.
  2. Remove `handleFillAdmin` function and the "بيانات الأدمن" button.
  3. Delete the default admin credential box (lines 150–159).
  4. Redesign the login card with an elegant, modern athletic visual container with password show/hide visibility toggle.
- **Acceptance Criteria:**
  - Visiting `/login` displays completely clean, empty input fields.
  - No secret credentials or passwords appear anywhere in the DOM or source HTML.

#### Task T-02: Remove Universal Backdoor Passwords in Verification Logic
- **Action:**
  1. In [`src/lib/auth.ts`](file:///d:/Gazzar%20Project/src/lib/auth.ts), delete line 26: `if (inputPassword === "A@123456" || inputPassword === "password123") return true;`.
  2. In [`src/context/AuthContext.tsx`](file:///d:/Gazzar%20Project/src/context/AuthContext.tsx), delete line 105 bypass check.
  3. Ensure password comparison is performed strictly via bcrypt or against the user's specific valid hash.
- **Acceptance Criteria:**
  - Attempting to log into any user account with default bypass strings fails with "Incorrect password".

#### Task T-03: Eradicate Unauthenticated Role Impersonation in Login Route
- **Action:**
  1. In [`src/app/api/auth/login/route.ts`](file:///d:/Gazzar%20Project/src/app/api/auth/login/route.ts), delete lines 10–16 (the `if (role && !email)` bypass).
- **Acceptance Criteria:**
  - Sending a POST request to `/api/auth/login` with only `{ "role": "ADMIN" }` returns a 400 Bad Request ("Email is required").

#### Task T-04: Remove Demo Role Switcher from Navbar & Shell
- **Action:**
  1. In [`src/components/layout/Navbar.tsx`](file:///d:/Gazzar%20Project/src/components/layout/Navbar.tsx), remove the Role Switcher dropdown and `loginAsRole()` invocations.
  2. Replace with a clean, static role badge indicating the currently logged-in user's role.
- **Acceptance Criteria:**
  - No user can switch their role from the UI without authenticating as that user.

---

### PHASE 2: Visual Transformation & Design System Elevation (Days 3–5)

#### Task T-05: Fix Theme Conflict & Establish Unified Athletic Design Palette
- **Action:**
  1. Eliminate the clash between light backgrounds and pitch-black banners.
  2. In [`src/app/globals.css`](file:///d:/Gazzar%20Project/src/app/globals.css), define clean, high-contrast Slate variables:
     - Background: Crisp, light slate (`#f8fafc`).
     - Card Backgrounds: Pure white (`#ffffff`) with subtle 1px border (`#e2e8f0`).
     - Primary Brand Accent: Refined Athletic Emerald (`#059669` / `#10b981`) or Athletic Cobalt (`#2563eb`).
  3. Re-style the Dashboard header banner in [`src/app/dashboard/page.tsx`](file:///d:/Gazzar%20Project/src/app/dashboard/page.tsx) to match the light-mode design system.
- **Acceptance Criteria:**
  - Zero harsh pitch-black blocks on light pages. All cards, banners, and widgets adhere to one cohesive palette.

#### Task T-06: Sanitize Micro-Copy & Eliminate Emoji Clutter
- **Action:**
  1. Remove informal emojis from headings, buttons, and navigation links (`"🏋️"`, `"📊"`, `"🏆"`, `"💡"`).
  2. Replace with high-quality, lightweight Lucide icons.
  3. Standardize Arabic and English terminology across all modules.
- **Acceptance Criteria:**
  - Professional, enterprise-grade typography free of informal iconography.

#### Task T-07: Standardize Border Radii & Design Tokens
- **Action:**
  1. Convert exaggerated `rounded-3xl` cards to sleek `rounded-xl` (12px) or `rounded-2xl` (16px).
  2. Standardize all primary and secondary buttons to consistent heights, padding, and corner radii.
- **Acceptance Criteria:**
  - Consistent layout geometry across all 20 module views.

---

### PHASE 3: Database & Backend Architecture Realization (Days 6–10)

#### Task T-08: Implement Next.js Server Middleware for Route Protection
- **Action:**
  1. Create [`src/middleware.ts`](file:///d:/Gazzar%20Project/src/middleware.ts).
  2. Validate session token on every non-public request (`/dashboard/*`, `/clients/*`, `/users/*`, etc.).
  3. Enforce strict role-based route access on the server before HTML or JS is returned to the client.
- **Acceptance Criteria:**
  - Unauthenticated requests are immediately redirected to `/login` via HTTP 307.
  - Athletes attempting to navigate to `/users` or `/audit-logs` receive an immediate 403 or redirect before the page renders.

#### Task T-09: Wire PostgreSQL & Prisma to API Routes / Server Actions
- **Action:**
  1. Configure reachable `DATABASE_URL` in `.env`.
  2. Create an automated migration script and populate `prisma/seed.js` with master sports catalog, muscle groups, and initial administrator.
  3. Refactor API routes (`/api/clients`, `/api/exercises`, `/api/workouts`, etc.) to query `prisma` directly.
  4. Replace frontend `db.*` calls with authenticated React Server Actions or API fetch hooks.
- **Acceptance Criteria:**
  - Data created in one browser or mobile device instantly persists in PostgreSQL and is visible to all authorized staff.
  - Browser `localStorage` is no longer used as a database.

#### Task T-10: Migrate Authentication to Secure `httpOnly` Cookies
- **Action:**
  1. Update `/api/auth/login` to set a secure, `httpOnly`, `SameSite=Lax` cookie upon successful authentication.
  2. Update `logout()` to clear the cookie.
- **Acceptance Criteria:**
  - Session tokens cannot be accessed or stolen via JavaScript (`document.cookie` / `localStorage`).

---

### PHASE 4: Production Hardening & Component Refactoring (Days 11–14)

#### Task T-11: Decompose Giant Page Components
- **Action:**
  1. Split `src/app/coaches/page.tsx` into modular components: `CoachList`, `AddCoachModal`, `AssignAthleteModal`, `CoachFilterBar`.
  2. Split `src/app/clients/page.tsx` into `ClientList`, `AddClientModal`, `QuickAssignModal`.
  3. Extract reusable UI modal and table components into `src/components/ui/`.
- **Acceptance Criteria:**
  - No single file exceeds 300 lines of code.

#### Task T-12: Implement Server-Side Pagination & Filtering
- **Action:**
  1. Update client and exercise endpoints to accept `?page=1&limit=20&search=...`.
  2. Use Prisma `take`, `skip`, and `where` clauses with database indexes.
- **Acceptance Criteria:**
  - Academy functions with sub-100ms response times on datasets of 10,000+ athletes.

#### Task T-13: Persistent Database Audit Trail Engine
- **Action:**
  1. Update `logAuditEvent()` in `src/lib/audit.ts` to write records to `prisma.auditLog.create(...)`.
  2. Capture client IP address from request headers (`x-forwarded-for`).
- **Acceptance Criteria:**
  - Audit logs are permanently stored in PostgreSQL and persist across server reboots.

#### Task T-14: Configure ESLint & Automated Quality Gate
- **Action:**
  1. Create `.eslintrc.json` extending `"next/core-web-vitals"`.
  2. Verify `npm run lint` passes with 0 errors.
- **Acceptance Criteria:**
  - `npm run lint` executes cleanly in CI/CD pipelines.
