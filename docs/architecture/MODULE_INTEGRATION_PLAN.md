# GX Academy – Business Module Staged Integration Plan

**Document Version:** 2.0.0  
**Status:** Approved Technical Design  
**Author:** Senior Backend Architect  
**Objective:** Incrementally migrate all 12 business modules from client `localStorage` to server-backed PostgreSQL APIs without breaking existing UI views.  

---

## 1. Migration Strategy: The "Parallel Adapter Pattern"

To prevent screen breakage or downtime during development, modules will be transitioned using the **Parallel Adapter Pattern**:
- Existing UI components consume a unified service interface.
- We implement the new `apiClient` methods against `/api/v1/*`.
- We switch the data source module-by-module.
- If an endpoint encounters an unexpected issue, the view can seamlessly fallback during staging verification.

```
+-------------------------------------------------------------+
|               EXISTING REACT COMPONENT UI                   |
|   (e.g., src/app/clients/page.tsx or exercises/page.tsx)    |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|               DATA ADAPTER / CLIENT HOOK                    |
|   src/lib/api/clients.ts   <--->   src/lib/api/exercises.ts|
+------------------------------+------------------------------+
                               |
               +---------------+---------------+
               | (New Backend)                 | (Legacy Fallback)
               v                               v
+-------------------------------+  +--------------------------+
|  HTTP Fetch (/api/v1/*)       |  |  Legacy LocalStorage     |
|  -> Prisma ORM -> PostgreSQL  |  |  (src/lib/db.ts)         |
+-------------------------------+  +--------------------------+
```

---

## 2. Staged Integration Matrix (12 Modules)

### Stage 1: Core Foundation (Users & Staff Identity)
- **Modules Covered:** Module 1 (Users & Authentication) & Module 2 (Coaches & Client Profiles)
- **Target Endpoints:**
  - `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
  - `GET, POST /api/v1/users`, `GET, PATCH /api/v1/users/[id]`
  - `GET, POST /api/v1/coaches`, `GET, PATCH /api/v1/coaches/[id]`
  - `GET, POST /api/v1/clients`, `GET, PATCH /api/v1/clients/[id]`
  - `POST /api/v1/clients/[id]/assign-coach`
- **UI Screens Swapped:**
  - [`src/app/login/page.tsx`](file:///d:/Gazzar%20Project/src/app/login/page.tsx)
  - [`src/app/users/page.tsx`](file:///d:/Gazzar%20Project/src/app/users/page.tsx)
  - [`src/app/coaches/page.tsx`](file:///d:/Gazzar%20Project/src/app/coaches/page.tsx)
  - [`src/app/clients/page.tsx`](file:///d:/Gazzar%20Project/src/app/clients/page.tsx) & [`src/app/clients/[id]/page.tsx`](file:///d:/Gazzar%20Project/src/app/clients/%5Bid%5D/page.tsx)
- **Verification Criteria:**
  - Login persists via `HttpOnly` cookie.
  - Adding a client in Chrome appears immediately when refreshed in Safari or on a mobile phone.

---

### Stage 2: Training Engine & Exercise Bank
- **Modules Covered:** Module 3 (Exercise Bank), Module 4 (Workout Templates), Module 5 (Training Programs)
- **Target Endpoints:**
  - `GET, POST /api/v1/sports`
  - `GET, POST /api/v1/exercises`, `GET, PATCH, DELETE /api/v1/exercises/[id]`
  - `GET, POST /api/v1/templates`, `GET, PATCH, DELETE /api/v1/templates/[id]`
  - `GET, POST /api/v1/programs`, `GET, PATCH, DELETE /api/v1/programs/[id]`
- **UI Screens Swapped:**
  - [`src/app/sports/page.tsx`](file:///d:/Gazzar%20Project/src/app/sports/page.tsx)
  - [`src/app/exercises/page.tsx`](file:///d:/Gazzar%20Project/src/app/exercises/page.tsx)
  - [`src/app/templates/page.tsx`](file:///d:/Gazzar%20Project/src/app/templates/page.tsx)
  - [`src/app/programs/page.tsx`](file:///d:/Gazzar%20Project/src/app/programs/page.tsx)
- **Verification Criteria:**
  - Complex nested relations (`TrainingProgram` -> `ProgramWeek` -> `ProgramDay` -> `WorkoutTemplate` -> `Exercise`) persist with foreign key integrity.
  - Contraindicated body parts save and filter accurately.

---

### Stage 3: Floor Operations & Workout Execution
- **Modules Covered:** Module 6 (Live Workout Execution) & Module 10 (Calendar & Attendance)
- **Target Endpoints:**
  - `GET, POST /api/v1/assignments` (Schedule athlete workouts)
  - `POST /api/v1/workouts/execute` (Live execution sets, reps, duration, RPE)
  - `GET, POST /api/v1/calendar/sessions` (Schedule group/PT sessions)
  - `POST /api/v1/calendar/attendance` (Mark present/absent/late)
- **UI Screens Swapped:**
  - [`src/app/assignments/page.tsx`](file:///d:/Gazzar%20Project/src/app/assignments/page.tsx)
  - [`src/app/workout/[id]/execute/page.tsx`](file:///d:/Gazzar%20Project/src/app/workout/%5Bid%5D/execute/page.tsx)
  - [`src/app/calendar/page.tsx`](file:///d:/Gazzar%20Project/src/app/calendar/page.tsx)
  - [`src/app/attendance/page.tsx`](file:///d:/Gazzar%20Project/src/app/attendance/page.tsx)
- **Verification Criteria:**
  - Athlete completing a workout on mobile immediately updates the coach's dashboard view.
  - Rest timer triggers smoothly; set completion logs with actual weights and reps in PostgreSQL `workout_logs` and `set_logs`.

---

### Stage 4: Athlete Health, Metrics & Nutrition
- **Modules Covered:** Module 7 (Nutrition & Meal Plans) & Module 8 (Assessments & Anthropometrics)
- **Target Endpoints:**
  - `GET, POST /api/v1/clients/[id]/measurements`
  - `GET, POST /api/v1/clients/[id]/goals`
  - `GET, POST /api/v1/clients/[id]/medical-restrictions`
  - `GET, POST /api/v1/clients/[id]/progress-photos`
  - `GET, POST /api/v1/nutrition`
  - `GET, POST /api/v1/assessments`
- **UI Screens Swapped:**
  - [`src/app/nutrition/page.tsx`](file:///d:/Gazzar%20Project/src/app/nutrition/page.tsx)
  - [`src/app/assessments/page.tsx`](file:///d:/Gazzar%20Project/src/app/assessments/page.tsx)
  - Client detail tabs: `MeasurementsTab`, `GoalsTab`, `MedicalTab`, `PhotosTab`.
- **Verification Criteria:**
  - Weight and body fat historical charts calculate directly from database time-series data.
  - Active medical restriction banners display prominently on the athlete's home view.

---

### Stage 5: Governance, Billing & Intelligence
- **Modules Covered:** Module 9 (Memberships & Payments), Module 11 (Audit Logs), Module 12 (Dashboard & Reports)
- **Target Endpoints:**
  - `GET, POST /api/v1/memberships`, `POST /api/v1/memberships/pay`
  - `GET /api/v1/audit-logs`
  - `GET /api/v1/dashboard/kpis`
  - `GET /api/v1/reports/revenue`
- **UI Screens Swapped:**
  - [`src/app/memberships/page.tsx`](file:///d:/Gazzar%20Project/src/app/memberships/page.tsx)
  - [`src/app/audit-logs/page.tsx`](file:///d:/Gazzar%20Project/src/app/audit-logs/page.tsx)
  - [`src/app/dashboard/page.tsx`](file:///d:/Gazzar%20Project/src/app/dashboard/page.tsx)
  - [`src/app/reports/page.tsx`](file:///d:/Gazzar%20Project/src/app/reports/page.tsx)
- **Verification Criteria:**
  - Revenue chart reflects actual sums of `paidAmount` from `memberships`.
  - Every mutating action generates an immutable audit record in PostgreSQL with actor ID and IP address.
