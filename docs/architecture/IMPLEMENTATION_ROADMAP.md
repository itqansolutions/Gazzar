# GX Academy – Backend Implementation Master Roadmap

**Document Version:** 2.0.0  
**Status:** Approved Implementation Blueprint  
**Author:** Senior Backend Architect  
**Methodology:** Small, independently testable, zero-regression micro-phases  

---

## 1. Roadmap Architecture & Phasing Principles

To guarantee that GX Academy's existing functional screens are never broken during the backend migration, the implementation is decomposed into **5 strictly ordered phases**:
- Every phase has clearly bounded files and isolated responsibilities.
- Every phase introduces its own automated regression test suite.
- Code from previous phases remains functional throughout the migration.

```
+----------------------------------------------------------------------------------------------------+
| MILESTONE 1 (Phase 2.1): Database & Authentication Foundation                                      |
| - Connect real PostgreSQL via Prisma                                                               |
| - Implement Server-Side Sessions & HttpOnly Cookies                                                |
| - Seed initial master taxonomies & Administrator                                                   |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
+-------------------------------------------------v--------------------------------------------------+
| MILESTONE 2 (Phase 2.2): Core Profile & Staff Roster Engine                                        |
| - Athletes Directory & Coaches Management                                                          |
| - Coach-to-Athlete Assignment Engine with strict Data Ownership Assertions                         |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
+-------------------------------------------------v--------------------------------------------------+
| MILESTONE 3 (Phase 2.3): Training Library & Execution Engine                                       |
| - Sports, Muscles, Equipment, Exercise Bank (with Contraindication Safety)                         |
| - Workout Templates, Training Programs, Live Workout Floor Execution Mode                          |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
+-------------------------------------------------v--------------------------------------------------+
| MILESTONE 4 (Phase 2.4): Health, Nutrition & Operations                                            |
| - Measurements, Milestones, Medical Injuries, Progress Photos                                      |
| - Meal Plans & Daily Macros, Session Scheduling & Attendance Tracking                              |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
+-------------------------------------------------v--------------------------------------------------+
| MILESTONE 5 (Phase 2.5): Financials, Governance & Mobile PWA Polish                                |
| - Memberships & Academy Billing, Persistent Audit Trail                                            |
| - Dashboard KPIs & Real Revenue Aggregation, Mobile Ergonomics & Offline Tolerance                 |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Detailed Phase Breakdowns

### PHASE 2.1: Database & Authentication Foundation (Milestone 1)
> **Objective:** Establish the live PostgreSQL database connection, deploy schema migrations, and implement secure server-side session cookies.

- **Scope:**
  - Update `prisma/schema.prisma` to include `Session` and `PasswordResetToken` models and performance indexes.
  - Configure valid `DATABASE_URL` and run `npx prisma db push`.
  - Create deterministic seed script (`prisma/seed.ts`) populating sports, muscle groups, equipment, and initial admin.
  - Create `src/middleware.ts` for Edge session extraction and route protection.
  - Implement `/api/v1/auth/login`, `/api/v1/auth/logout`, and `/api/v1/auth/me` with `Set-Cookie: gx_session`.
  - Update `AuthContext.tsx` to read user identity from `/api/v1/auth/me` instead of `localStorage`.
- **Files Affected:**
  - `prisma/schema.prisma`
  - `prisma/seed.ts` (New)
  - `src/middleware.ts` (New)
  - `src/app/api/v1/auth/login/route.ts` (New)
  - `src/app/api/v1/auth/logout/route.ts` (New)
  - `src/app/api/v1/auth/me/route.ts` (New)
  - `src/context/AuthContext.tsx`
  - `src/server/auth/session.ts` (New)
- **Dependencies:** PostgreSQL database instance running.
- **Risks:** Cookie domain mismatches during local testing (`localhost` vs HTTPS).
- **Acceptance Criteria:**
  - Logging in sets a valid `HttpOnly` cookie in the browser network inspector.
  - Refreshing the page retains login state via `/api/v1/auth/me` query without touching `localStorage`.
  - Logging out deletes the session record from PostgreSQL and wipes the cookie.
- **Regression Test Command:**
  ```bash
  node --test tests/auth-session.test.mjs
  ```

---

### PHASE 2.2: Athletes, Coaches & Ownership Governance (Milestone 2)
> **Objective:** Migrate athlete and coach directory management to PostgreSQL and activate server-side data ownership checks (`assertCanAccessClient`).

- **Scope:**
  - Build endpoints: `/api/v1/clients`, `/api/v1/clients/[id]`, `/api/v1/coaches`, `/api/v1/coaches/[id]`.
  - Implement `assertCanAccessClient()` in `src/server/auth/authorization.ts`.
  - Implement Coach Assignment logic (`ClientCoachAssignment`) with atomic transactions.
  - Wire `src/app/clients/page.tsx` and `src/app/coaches/page.tsx` to fetch from `/api/v1/*`.
- **Files Affected:**
  - `src/server/services/client.service.ts` (New)
  - `src/server/services/coach.service.ts` (New)
  - `src/server/auth/authorization.ts` (New)
  - `src/app/api/v1/clients/route.ts` (New)
  - `src/app/api/v1/clients/[id]/route.ts` (New)
  - `src/app/api/v1/coaches/route.ts` (New)
  - `src/app/clients/page.tsx`
  - `src/app/coaches/page.tsx`
- **Dependencies:** Milestone 1 completed.
- **Risks:** Coaches seeing unassigned athletes if ownership checks are misconfigured.
- **Acceptance Criteria:**
  - A coach logging in sees only athletes assigned to their roster.
  - Manually typing `/clients/[id]` for an unassigned athlete returns HTTP 403 Forbidden.
  - Administrator sees all athletes across the academy.
- **Regression Test Command:**
  ```bash
  node --test tests/authorization-ownership.test.mjs
  ```

---

### PHASE 2.3: Training Library & Floor Execution Engine (Milestone 3)
> **Objective:** Migrate sports catalog, exercises, workout templates, programs, and live gym-floor workout logging.

- **Scope:**
  - Build endpoints for `/api/v1/exercises`, `/api/v1/templates`, `/api/v1/programs`, `/api/v1/assignments`, `/api/v1/workouts/execute`.
  - Implement live set-by-set logging in `workout_logs` and `set_logs`.
  - Enforce medical injury safeguards: warn coach if an exercise contraindicated for the athlete's knee/shoulder is added.
  - Wire `src/app/exercises/page.tsx`, `src/app/templates/page.tsx`, `src/app/programs/page.tsx`, and `src/app/workout/[id]/execute/page.tsx`.
- **Files Affected:**
  - `src/server/services/exercise.service.ts` (New)
  - `src/server/services/workout.service.ts` (New)
  - `src/app/api/v1/exercises/route.ts` (New)
  - `src/app/api/v1/templates/route.ts` (New)
  - `src/app/api/v1/programs/route.ts` (New)
  - `src/app/api/v1/workouts/execute/route.ts` (New)
  - `src/app/workout/[id]/execute/page.tsx`
- **Dependencies:** Milestone 2 completed.
- **Risks:** High write concurrency during peak gym hours (multiple athletes completing sets simultaneously).
- **Acceptance Criteria:**
  - Athletes can complete a workout set-by-set on mobile with rest timers ticking.
  - Completed workout records persist in PostgreSQL with RPE and duration.
- **Regression Test Command:**
  ```bash
  node --test tests/workout-execution.test.mjs
  ```

---

### PHASE 2.4: Health, Nutrition & Operations (Milestone 4)
> **Objective:** Migrate anthropometric measurements, goals, medical records, progress photos, diet plans, calendar sessions, and attendance registers.

- **Scope:**
  - Endpoints for measurements, goals, medical restrictions, photos, meal plans, calendar, and attendance.
  - Secure pre-signed URL upload pipeline for progress photos.
  - Wire client profile sub-tabs (`MeasurementsTab`, `GoalsTab`, `MedicalTab`, `PhotosTab`), `src/app/nutrition/page.tsx`, `src/app/calendar/page.tsx`, and `src/app/attendance/page.tsx`.
- **Files Affected:**
  - `src/server/services/health.service.ts` (New)
  - `src/server/services/attendance.service.ts` (New)
  - `src/app/api/v1/calendar/route.ts` (New)
  - `src/app/api/v1/nutrition/route.ts` (New)
  - `src/components/clients/*`
- **Dependencies:** Milestone 3 completed.
- **Acceptance Criteria:**
  - Anthropometric charts calculate directly from database measurements.
  - Attendance marking updates session attendance records in real-time.

---

### PHASE 2.5: Governance, Billing & Mobile Polish (Milestone 5)
> **Objective:** Finalize academy billing, database audit logs, dashboard metrics, and mobile PWA optimization.

- **Scope:**
  - Endpoints for memberships, payments, audit logs, and dashboard metrics.
  - Replace mock revenue in `src/app/dashboard/page.tsx` with real SQL aggregations.
  - Enable immutable audit event logging on all mutating endpoints.
  - Add PWA manifest, service worker caching for offline workout tracking, and mobile touch optimizations.
- **Files Affected:**
  - `src/server/services/billing.service.ts` (New)
  - `src/server/services/dashboard.service.ts` (New)
  - `src/app/api/v1/dashboard/route.ts` (New)
  - `src/app/api/v1/memberships/route.ts` (New)
  - `src/app/api/v1/audit-logs/route.ts` (New)
  - `src/app/dashboard/page.tsx`
- **Dependencies:** Milestone 4 completed.
- **Acceptance Criteria:**
  - Dashboard KPIs reflect 100% real database numbers.
  - Full system operates without a single reference to `localStorage` or `mockData`.
