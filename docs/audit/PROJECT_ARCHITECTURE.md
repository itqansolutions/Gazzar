# GX Academy – Technical Architecture Audit Report

**Audit Date:** 2026-11-01  
**Auditor Role:** Senior Software Architect & Security Engineer  
**System Scope:** Standalone Single-Academy Management System (Non-SaaS, Non-Tenant)  
**Target Codebase:** `d:\Gazzar Project`  

---

## 1. Executive Architecture Overview

GX Academy is architecturally designed as a single-institution athletic training and academy management platform. It encompasses four user roles:
1. **System Admin** (`ADMIN`)
2. **Head Coach** (`HEAD_COACH`)
3. **Coach** (`COACH`)
4. **Athlete / Client** (`CLIENT`)

### The Architectural Reality: "Dual-Engine Decoupling"
An exhaustive inspection of the codebase reveals a fundamental architectural dichotomy between the **Declared Tech Stack** and the **Runtime Implementation**:

```
+---------------------------------------------------------------------------------------+
|                                    DECLARED STACK                                     |
|  Next.js 14 App Router -> Next.js API Routes -> Prisma ORM Client -> PostgreSQL (DB)  |
+---------------------------------------------------------------------------------------+
                                           VS
+---------------------------------------------------------------------------------------+
|                                  RUNTIME REALITY                                      |
|  Next.js Client Components (SPA) <-> CoachingStore (src/lib/db.ts) <-> localStorage   |
|                                                                                       |
|  * Prisma ORM: Disconnected from all runtime execution (0 queries executed in app)    |
|  * API Routes: Disconnected from frontend pages (0 fetch calls made by UI)            |
|  * Database: Operates entirely inside the client browser's localStorage ("gx_db_v1")  |
+---------------------------------------------------------------------------------------+
```

---

## 2. Directory & Application Structure

```
d:\Gazzar Project\
├── prisma\
│   ├── schema.prisma             # 677-line relational schema (23 models)
│   └── seed.js                   # Minimal stub (logs message, no actual database seeding)
├── public\                       # Static assets (favicons, SVG icons)
├── src\
│   ├── app\                      # Next.js 14 App Router
│   │   ├── api\                  # Backend API routes (10 route handlers)
│   │   │   ├── auth\             # Authentication endpoints (/api/auth, /login, /me)
│   │   │   ├── clients\          # Clients endpoints (/api/clients, /[id])
│   │   │   ├── coaches\[id]\     # Coach details endpoint
│   │   │   ├── exercises\        # Exercises catalog endpoint
│   │   │   ├── users\            # Users administration endpoints (/api/users, /[id])
│   │   │   └── workouts\         # Workouts execution endpoint
│   │   ├── (business modules)\   # 20 distinct page routes (all "use client")
│   │   │   ├── assessments\      # Physical benchmarks & testing
│   │   │   ├── assignments\      # Workout schedule assignments
│   │   │   ├── attendance\       # Session attendance tracking
│   │   │   ├── audit-logs\       # System event logs viewer
│   │   │   ├── calendar\         # Schedule & booking calendar
│   │   │   ├── clients\          # Client directory & detailed profile (/clients/[id])
│   │   │   ├── coaches\          # Coach directory & management
│   │   │   ├── dashboard\        # Role-based KPI dashboard
│   │   │   ├── exercises\        # Exercise library & contraindications
│   │   │   ├── login\            # Authentication screen
│   │   │   ├── memberships\      # Academy packages & payments
│   │   │   ├── nutrition\        # Meal plans & macro tracking
│   │   │   ├── programs\         # Periodized training programs
│   │   │   ├── reports\          # Academy reporting & analytics
│   │   │   ├── settings\         # Profile & platform settings
│   │   │   ├── sports\           # Sports categories catalog
│   │   │   ├── templates\        # Workout template builder
│   │   │   ├── users\            # User accounts management
│   │   │   └── workout\[id]\     # Live workout execution mode
│   │   ├── globals.css           # Global Tailwind & CSS custom properties
│   │   ├── layout.tsx            # Root HTML layout with context providers
│   │   └── page.tsx              # Root redirector (/dashboard or /login)
│   ├── components\
│   │   ├── clients\              # Client detail sub-tabs (7 tabs)
│   │   └── layout\               # Shell, Navbar, Sidebar, BottomNav
│   ├── context\                  # Global state via React Context
│   │   ├── AuthContext.tsx       # Session state, login, role impersonation
│   │   ├── LanguageContext.tsx   # Bilingual i18n state (ar/en, rtl/ltr)
│   │   └── ThemeContext.tsx      # Theme state (currently forced light)
│   ├── lib\
│   │   ├── audit.ts              # In-memory audit logging helper
│   │   ├── auth.ts               # JWT signing & bcrypt password verification
│   │   ├── db.ts                 # CoachingStore: In-memory & localStorage engine (1,363 lines)
│   │   ├── i18n.ts               # Localization dictionary (Arabic / English)
│   │   ├── mockData.ts           # Barrel re-export for seed fixtures
│   │   ├── prisma.ts             # PrismaClient singleton instance
│   │   └── data\                 # Fixtures (clients, exercises, sports, users, workouts)
│   └── types\
│       └── index.ts              # Central domain TypeScript definitions
├── .env                          # Local environment variables
├── .env.example                  # Environment variable blueprint
├── package.json                  # Dependencies & execution scripts
├── tailwind.config.ts            # Tailwind styling configuration
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 3. Frontend Architecture

### 3.1 Component Organization & Paradigm
- **100% Client-Side Rendered (CSR):** Every route under `src/app/` begins with `"use client"`. The benefits of Next.js 14 Server Components (streaming, zero-bundle-size server libraries, secure data fetching) are currently completely unutilized.
- **Monolithic Page Pattern:** Pages are authored as massive single-file components ranging between 500 and 1,200 lines (e.g., `src/app/coaches/page.tsx` is 1,187 lines; `src/app/clients/page.tsx` is 938 lines). Modals, table rows, form inputs, validation, and state tickers are coupled inside the page files.
- **Component Sub-tree:**
  - `src/components/layout/AppShell.tsx`: Wraps all protected views, orchestrates client-side route guard in `useEffect`, and mounts `Navbar`, `Sidebar`, and `BottomNav`.
  - `src/components/layout/Navbar.tsx`: Sticky top navigation housing Academy branding, demo role switcher, language switcher, notification trigger, and user profile drawer.
  - `src/components/layout/Sidebar.tsx`: Collapsible drawer with role-filtered links.
  - `src/components/layout/BottomNav.tsx`: Mobile viewport tab-bar navigation.
  - `src/components/clients/*`: Modularized client profile tabs (`CoachesTab`, `GoalsTab`, `MeasurementsTab`, `MedicalTab`, `NotesTab`, `PhotosTab`, `WorkoutsTab`).

---

## 4. Backend & API Architecture

### 4.1 Route Handlers (`src/app/api/`)
The project defines 10 API route handlers in `src/app/api/`:
1. `GET, POST /api/auth` (`src/app/api/auth/route.ts`)
2. `POST /api/auth/login` (`src/app/api/auth/login/route.ts`)
3. `GET /api/auth/me` (`src/app/api/auth/me/route.ts`)
4. `GET, POST /api/clients` (`src/app/api/clients/route.ts`)
5. `GET, PATCH, DELETE /api/clients/[id]` (`src/app/api/clients/[id]/route.ts`)
6. `GET, PATCH /api/coaches/[id]` (`src/app/api/coaches/[id]/route.ts`)
7. `GET, POST /api/exercises` (`src/app/api/exercises/route.ts`)
8. `GET, POST /api/users` (`src/app/api/users/route.ts`)
9. `GET, PATCH, DELETE /api/users/[id]` (`src/app/api/users/[id]/route.ts`)
10. `POST /api/workouts` (`src/app/api/workouts/route.ts`)

### 4.2 Empty API Directories
The following directories exist under `src/app/api/` but contain **no route.ts file**:
- `src/app/api/assessments/`
- `src/app/api/assignments/`
- `src/app/api/attendance/`
- `src/app/api/audit-logs/`
- `src/app/api/memberships/`
- `src/app/api/nutrition/`
- `src/app/api/programs/`
- `src/app/api/reports/`
- `src/app/api/sports/`
- `src/app/api/templates/`

### 4.3 Frontend-to-Backend Disconnect
- **Zero API Invocations:** A codebase-wide scan reveals **0 instances** of `fetch()` targeting `/api/*` within frontend components.
- **Client Direct Coupling:** Frontend components directly import the JavaScript singleton `db` from `@/lib/db`.
- **Server vs Client State Divergence:** Because `src/lib/db.ts` relies on `window.localStorage`, when API routes execute on the server in Node.js, `window` is undefined. The server-side API operates on initial memory state and cannot access or mutate changes made in the client's browser.

---

## 5. State Management & Context Architecture

The application relies on three global React Contexts wrapped in `src/app/layout.tsx`:

1. **`AuthContext` (`src/context/AuthContext.tsx`):**
   - Stores `user: SessionUser | null` and `loading: boolean`.
   - Reads/writes active session to `localStorage.getItem("gx_session_user")`.
   - Listens to custom DOM events: `window.addEventListener("gx_db_change", ...)`.
   - Exposes `loginAsRole(role: UserRole)` which bypasses authentication.
2. **`LanguageContext` (`src/context/LanguageContext.tsx`):**
   - Manages language state (`"ar"` | `"en"`), document direction (`dir="rtl"` | `dir="ltr"`), and translation function `t(key)`.
   - Persists selection to `localStorage.getItem("gx_lang")`.
3. **`ThemeContext` (`src/context/ThemeContext.tsx`):**
   - Manages theme mode (`"light"` | `"dark"`).
   - Currently hardcoded to permanently enforce `"light"` mode on mount and disable toggling.

---

## 6. External Integrations & Dependencies

From `package.json`:
- **Core:** `next: ^14.2.15`, `react: ^18.3.1`, `react-dom: ^18.3.1`
- **Database/ORM:** `@prisma/client: ^5.22.0`, `prisma: ^5.22.0`
- **Authentication/Crypto:** `jsonwebtoken: ^9.0.2`, `bcryptjs: ^2.4.3`
- **UI/Styling:** `tailwindcss: ^3.4.14`, `lucide-react: ^0.460.0`, `clsx: ^2.1.1`, `tailwind-merge: ^2.5.4`
- **Data Visualization:** `recharts: ^2.13.3`
- **External Network Requests:** Unsplash image URLs for avatars. No third-party analytics, payment gateways (Stripe/PayPal), or cloud storage (S3/Cloudinary) SDKs are currently integrated. All uploads and assets are represented as URL strings.
