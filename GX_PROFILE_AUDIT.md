# Gazzar Fit — Athlete & Coach Profile Deep Audit
**Document Version:** 1.0.0  
**Audit Date:** 2026-11-18  
**Scope:** Athlete Profile (`/clients/[id]`), Coach Profiles (`/coaches`), Coach Monitoring & Review Ecosystem (Phases 4–9 Reconciliation)  
**Status:** Complete Audit — Read-Only / Ground Truth Verified  

---

## Executive Summary

Across Phases 4 through 9, the Gazzar Fit platform gained extensive athlete sub-resources: daily check-in scheduling, historical body measurements, progress photos, medical restrictions, athletic goals, coach notes with visibility scopes, nutrition assignments with daily intake tracking, assessment test benchmarks, block-aware workout execution, atomic set logging, and coach adherence monitoring with post-session reviews.

However, an end-to-end audit reveals a **disconnect between the backend data layer and the UI presentation**:
1. **Athlete Profile (`/clients/[id]`)**: Has grown to **11 separate horizontal tabs**, creating navigation fatigue. More critically, key capabilities built in Phases 4–9 are either completely hidden (e.g., `PUBLIC_CLIENT` coach notes are blocked from athletes), stubbed without write/update actions (e.g., goals has no progress bars or CRUD UI), missing essential analytical views (e.g., progress photos has no side-by-side comparison slider; workouts tab shows no adherence percentage or coach review notes), or locked so athletes cannot self-log weight.
2. **Coach Profile & Screens (`/coaches`, `/dashboard`, `/reports`)**: There is **no individual coach profile page** (`/coaches/[id]` does not exist). The main coach entry point (`/dashboard`) still displays gym-wide placeholder statistics and hardcoded zero-value charts rather than the coach's assigned athletes, leaving the newly built Phase 9 Monitoring and Session Review capabilities buried exclusively under `/reports`. Furthermore, submitted coach reviews vanish from view once sent, with no athlete-facing or coach-facing historical log.

---

## PART A — Athlete Profile (`/clients/[id]`)

### 1. Tab Inventory & Architecture

The athlete profile page (`src/app/clients/[id]/page.tsx`) renders a persistent athlete header (summary cards for phone, email, join date, age/gender, height/weight, emergency contact, sport, tags) followed by an 11-tab navigation bar.

| # | Tab ID | Label | Data Displayed | API Endpoint(s) Called | Prisma Model(s) Read | RBAC Visibility & Editability |
|---|--------|-------|----------------|------------------------|----------------------|-------------------------------|
| 1 | `checkins` | Check-Ins | Active check-in schedule (days, time, auto-remind, grace period), compliance score (%), and historical check-in logs table (weight, sleep, mood, stress, notes). | `GET /api/clients/[id]/check-in-schedule`<br>`POST /api/clients/[id]/check-in-schedule` | `CheckInSchedule`, `CheckInLog` | **View:** ADMIN, COACH, CLIENT.<br>**Edit Schedule:** ADMIN, COACH only (modal). |
| 2 | `program` | Training Program | Active `ProgramRoadmap`, current phase, week-by-week program structure, roadmap completion %, workout session sequence. | Uses initial client payload (`client.programRoadmaps`) | `ProgramRoadmap`, `ProgramWeek`, `ClientWorkoutAssignment` | **View:** ADMIN, COACH, CLIENT.<br>**Edit:** Managed in Programs section (`/programs`). |
| 3 | `workouts` | Workouts | List of workout assignments (`ClientWorkoutAssignment`), scheduled date, status badge (`COMPLETED`, `PENDING`, `MISSED`, `IN_PROGRESS`), duration, notes, link to execute (`/workout/[id]/execute`). | `GET /api/workouts?clientId=[id]` | `ClientWorkoutAssignment`, `WorkoutSessionTemplate` | **View:** ADMIN, COACH, CLIENT.<br>**Edit:** Execute workout (CLIENT/COACH), Assign (Admin modal). |
| 4 | `nutrition` | Nutrition | Active nutrition plan macro targets (calories, protein, carbs, fats), daily meal structures, daily food intake logs, calorie compliance %, coach feedback notes. | `GET /api/nutrition/client/[id]` | `ClientNutritionAssignment`, `DailyIntakeLog` | **View:** ADMIN, COACH, CLIENT.<br>**Edit:** Admin/Coach manages assignment; Client logs daily meals. |
| 5 | `measurements` | Measurements | Body weight trend line/area chart (`recharts`), historical table of body composition (weight, body fat %, muscle mass, waist, chest, arms, thighs, hips). | Uses `client.measurements` payload.<br>`POST /api/clients/[id]/measurements` | `ClientMeasurement` | **View:** ADMIN, COACH, CLIENT.<br>**Edit:** ADMIN, COACH only (modal). Client cannot self-log weight here. |
| 6 | `assessments` | Assessments | Functional fitness & athletic test results grouped by category (Strength, Endurance, Mobility, Power), radar comparison chart against baseline, benchmark metric cards. | `GET /api/assessments/client/[id]`<br>`POST /api/assessments/client/[id]` | `ClientAssessment`, `AssessmentTestResult` | **View:** ADMIN, COACH, CLIENT.<br>**Edit:** ADMIN, COACH (Record Assessment modal). |
| 7 | `photos` | Photos | Visual grid of progress photos with pose tag badges (`FRONT`, `SIDE`, `BACK`), upload date, athlete weight at time of photo. | Uses `client.progressPhotos` payload.<br>`POST /api/clients/[id]/photos` | `ProgressPhoto` | **View:** ADMIN, COACH, CLIENT.<br>**Upload:** ADMIN, COACH, CLIENT. |
| 8 | `medical` | Medical | Medical conditions, injury records, severity level (`MILD`, `MODERATE`, `SEVERE`), contraindicated exercises/movements, clearance status. | Uses `client.medicalRestrictions` payload.<br>`POST /api/clients/[id]/medical` | `MedicalRestriction` | **View:** ADMIN, COACH, CLIENT.<br>**Edit:** ADMIN, COACH only (modal). |
| 9 | `goals` | Goals | Goal title, target value, category (`STRENGTH`, `WEIGHT_LOSS`, `ENDURANCE`, `HABIT`), target deadline, status badge. | Uses `client.goals` payload. | `ClientGoal` | **View:** ADMIN, COACH, CLIENT.<br>**Edit:** None in UI (API exists, UI is read-only). |
| 10 | `coaches` | Coaches | List of assigned coaches (Primary, Assistant, Specialist), assigned date, coach profile link/details. | Uses `client.coaches` payload.<br>`POST /api/clients/[id]/coaches`<br>`DELETE /api/clients/[id]/coaches/[coachId]` | `CoachClientAssignment`, `CoachProfile`, `User` | **View:** ADMIN, COACH, CLIENT.<br>**Assign/Unassign:** ADMIN, HEAD_COACH only. |
| 11 | `notes` | Notes | Chronological coach notes timeline, author name, timestamp, note body, category tag. | Uses `client.notes` payload.<br>`POST /api/clients/[id]/notes` | `CoachNote` | **View:** ADMIN, COACH only.<br>**CRITICAL DEFECT:** Hidden completely from CLIENT via line 250 in `page.tsx`. |

---

### 2. Phase 4–9 Capabilities Status on `/clients/[id]`

| Phase Feature | Status on Page | UI Realization & Limitations |
|---|---|---|
| **Measurements Trend Over Time** | **WORKING** | Recharts `AreaChart` renders weight history over time; comprehensive data table displays circumference and body fat records. Supports adding records via modal. |
| **Check-In Schedule & Compliance** | **WORKING** | Shows weekly scheduled days, time window, auto-reminder badge, compliance score percentage bar, and check-in log history with mood/sleep/stress chips. |
| **Progress Photos (Before / After)** | **PARTIAL** | Shows a standard 3-column photo gallery with pose filters. **Missing:** No side-by-side comparison tool, no date-range slider, and no overlay diffing tool. |
| **Medical Restrictions & Contraindications** | **WORKING** | Clear severity badges, affected muscle/joint groups, list of contraindicated exercises to avoid during workouts, and add restriction modal. |
| **Goals & Target Tracking** | **PARTIAL / READ-ONLY** | Renders static cards displaying target metric and deadline. **Missing:** No progress bar against baseline/current value, and **zero interactive buttons** (no Add Goal, no Edit Goal, no Delete Goal) even though `/api/clients/[id]/goals` has full CRUD support. |
| **Coach Notes (Private vs Public)** | **DEFECT / BROKEN FOR CLIENTS** | Backend supports `visibility: 'PRIVATE_COACH' \| 'PUBLIC_CLIENT'`. In `page.tsx` line 250, the entire tab is conditionally omitted: `...(!isClient ? [{ id: "notes", ... }] : [])`. As a result, **athletes can never view public notes their coach left for them**. |
| **Nutrition Plan & Daily Intake Logs** | **WORKING** | Macro target cards, meal plan distribution, intake logs with calories and protein tracking, and adherence rating display. |
| **Assigned Workouts & Adherence %** | **PARTIAL** | Lists assigned workout cards with status (`COMPLETED`, `PENDING`, `MISSED`) and execution button. **Missing:** Does not compute or display workout adherence percentage (completed vs assigned) and does not display volume/load metrics. |
| **Athletic Assessments & Benchmarks** | **WORKING** | Displays radar chart of performance across 4 categories, benchmark progression cards, and a modal to record battery test sessions. |
| **Coach Reviews & Post-Session Feedback** | **MISSING** | Phase 8 added `SetLog.coachReview` & `coachReviewedAt`; Phase 9 added `ClientWorkoutAssignment.reviewFeedback`. **None of this is rendered on the athlete profile or workouts tab.** Feedback is completely invisible to the athlete on this page. |

---

### 3. Deep UI & UX Gaps by Component

1. **`CheckInsTab.tsx`**:
   - Athletes viewing their own profile cannot trigger a check-in submission directly from this tab (submission is isolated in a separate route or dashboard widget).
   - Missing ability to export check-in compliance reports as PDF/CSV.
2. **`MeasurementsTab.tsx`**:
   - `!isClient` check prevents athletes from logging their own morning weigh-in from their profile.
   - No target weight reference line on the `AreaChart`.
   - No edit or delete button on historical measurement rows for correcting erroneous entries.
3. **`PhotosTab.tsx`**:
   - No side-by-side or "Before vs After" split-screen slider.
   - Clicking a photo does not open a high-resolution lightbox or zoom modal.
   - No option to delete or re-categorize an uploaded photo.
4. **`GoalsTab.tsx`**:
   - Completely static: cannot add a new goal, edit an existing target, or mark a goal as completed/abandoned.
   - Does not pull the athlete's latest measurement (e.g. current weight) to calculate dynamic percentage completion toward the goal target.
5. **`NotesTab.tsx`**:
   - Severe RBAC oversight: In `src/app/clients/[id]/page.tsx`, `notes` is completely excluded from the tabs array for `CLIENT`. While `client.service.ts` correctly filters out `PRIVATE_COACH` notes, the frontend never renders the tab for clients to see `PUBLIC_CLIENT` notes.
   - No search or tag filtering on notes.
6. **`WorkoutsTab.tsx`**:
   - Does not show the athlete's overall workout adherence % (e.g. "88% completion over last 30 days").
   - Completed workouts do not display the coach's review notes or set-level feedback added in Phases 8 & 9.
   - No filter by date range or program phase.

---

### 4. Tab Structure & Cognitive Overload

With **11 horizontal tabs** (`checkins`, `program`, `workouts`, `nutrition`, `measurements`, `assessments`, `photos`, `medical`, `goals`, `coaches`, `notes`), the athlete profile suffers from significant horizontal scrolling on mobile/tablet viewports and navigational fragmentation:
- **Redundancy between `Program` and `Workouts`**: `Program` displays the macro roadmap and weekly schedules, while `Workouts` displays individual workout assignments. Users are forced to switch between two tabs to understand what they are supposed to train today versus this month.
- **Scattered Progress Data**: `Measurements`, `Photos`, `Assessments`, and `Goals` represent 4 separate tabs for tracking physical progress. Consolidating these into a unified **"Progress & Analytics"** hub (with sub-views for Metrics, Body Photos, Benchmarks, and Goals) would reduce tab count from 11 to 7.

---

### 5. Athlete Self-Service Experience Gaps

When an athlete (`role: 'CLIENT'`) logs into their account and navigates to their profile (`/clients/[id]`):
- **Invisible Coach Communications**: The athlete cannot read feedback or tips left by their coach in `CoachNote` (`PUBLIC_CLIENT`) because the `notes` tab is completely hidden.
- **No Self-Logging on Profile**: Athletes cannot log a weight measurement or create a personal goal from this screen; all write modals are hidden behind `!isClient`.
- **Session Review Blind Spot**: Athletes cannot see the coach's technical review comments or kudos on their completed workouts.

---

## PART B — Coach Profile & Coach-Facing Screens

### 1. Existing Coach Screens & Database Omissions

1. **Coach Directory (`/coaches/page.tsx`)**:
   - Displays a grid of coach cards containing name, email, phone, avatar, specialties chips, years of experience, and a bio excerpt.
   - Includes admin-only controls for adding a new coach, editing coach profiles, and assigning athletes to coaches.
2. **Missing Individual Coach Page (`/coaches/[id]`)**:
   - **`src/app/coaches/[id]/page.tsx` DOES NOT EXIST.**
   - Clicking on a coach card in `/coaches` does not open a dedicated profile page. There is no route for viewing a coach's full roster, assigned athletes, past reviews, or schedule.
3. **Un-screened `CoachProfile` Data in Prisma**:
   - `hourlyRate`: Stored in database, never displayed in UI.
   - `certification`: Stored in database, never displayed in UI.
   - Athlete roster history: Shows count of active assigned athletes, but no breakdown of active vs inactive or athlete sports.
   - Coach performance analytics: Total workouts assigned, review turnaround time, and athlete adherence rates under this coach are not calculated or shown.

---

### 2. Coach Monitoring & Review Ecosystem (Phase 9 Audit)

1. **Where do coaches go today?**
   - The Phase 9 Coach Monitoring dashboard (`GET /api/coach/monitoring`) and Session Review tool (`POST /api/coach/review`) are located **exclusively under `/reports`** (`src/app/reports/page.tsx`) across two tabs:
     - Tab 2: **"Athlete Adherence"** (`activeTab === 'MONITORING'`)
     - Tab 3: **"Pending Reviews"** (`activeTab === 'REVIEWS'`)
2. **The Coach Home Problem (`/dashboard`)**:
   - When a coach logs into Gazzar Fit, they land on `/dashboard`.
   - `/dashboard` displays gym-level KPIs (Total Members, Active Programs, Sessions, Coaches) alongside **hardcoded 0-value charts** (`activityData` with 7 days at 0; `progressData` with 6 months at 0).
   - **There is no coach operational widget on `/dashboard`.** A coach has no indication on their home screen that 5 of their athletes missed workouts this week or that 3 completed sessions are waiting for review.
3. **Submitted Review Amnesia**:
   - Once a coach submits feedback on a session via the `/reports` "Pending Reviews" tab, that session transitions from pending to reviewed and disappears from the list.
   - There is **no "Completed Reviews" or history view** anywhere in the system where a coach or athlete can look back at past review comments.

---

### 3. Public Bio vs Internal Coach Profile

Gazzar Fit maintains two distinct representations of a coach:
1. **`CoachProfile`** (Operational): Contains `userId`, `specialties`, `bio`, `yearsOfExperience`, `hourlyRate`, `certification`, and athlete relationships.
2. **`PublicCoachProfile`** (Marketing / CMS): Managed at `/admin-public/coaches` (`src/app/admin-public/coaches/page.tsx`). Contains `isPublic`, `displayOrder`, `publicTitle`, and `publicBio`.

**Synchronization & Drift Issues:**
- `PublicCoachProfile` is linked via `coachProfileId` to `CoachProfile`.
- However, if an administrator or coach updates their `bio` or `specialties` in the internal directory (`/coaches`), those changes **do not automatically sync** to the public marketing site.
- There is no preview mode on `/coaches` allowing a coach or admin to see how their profile appears to prospective public athletes.

---

## PART C — Prioritized Recommendations Matrix

The following table summarizes all identified gaps across the athlete profile, coach profile, and monitoring workflows, categorized by priority and estimated effort.

| ID | Issue Description | Impact & Rationale | Scope | Effort | Priority |
|:---|:---|:---|:---|:---:|:---:|
| **GAP-01** | **Expose Public Coach Notes to Athletes** | Athletes currently cannot view notes marked `PUBLIC_CLIENT` because `src/app/clients/[id]/page.tsx` hides the `notes` tab for `role === 'CLIENT'`. Removing this blanket filter and letting the API deliver public-only notes restores crucial coach-to-athlete communication. | `/clients/[id]` | **S** | **P0** |
| **GAP-02** | **Display Coach Review Feedback on Workout History** | Phase 8 & 9 added post-session review feedback (`coachReview`, `coachReviewedAt`, `reviewFeedback`), but this data is never shown to athletes on their profile or completed workout details. | `/clients/[id]`, `/workout` | **M** | **P0** |
| **GAP-03** | **Interactive Goals Management UI** | `/api/clients/[id]/goals` has full CRUD endpoints, but `GoalsTab.tsx` is completely static with no Create/Edit/Delete actions or dynamic progress bars. | `/clients/[id]` | **M** | **P0** |
| **GAP-04** | **Coach Operational Briefing on `/dashboard`** | Replace the hardcoded 0-value charts on the coach dashboard with a real Coach Command Center: athletes needing attention (<60% adherence), pending session reviews count, and today's athlete check-ins. | `/dashboard` | **M** | **P1** |
| **GAP-05** | **Build Dedicated Coach Profile Page (`/coaches/[id]`)** | Currently `/coaches/[id]` does not exist. Clicking a coach card does nothing. Need a dedicated profile showing specialties, certifications, assigned athletes roster, adherence stats, and review history. | `/coaches/[id]` | **M** | **P1** |
| **GAP-06** | **Progress Photos Before/After Comparison Tool** | `PhotosTab.tsx` currently only offers a static photo grid. A slider or side-by-side date comparison view is essential for visual body transformation tracking. | `/clients/[id]` | **M** | **P1** |
| **GAP-07** | **Completed Reviews History View** | Submitted session reviews vanish from `/reports` once submitted. A "Review History" tab is needed so coaches and head coaches can audit past feedback. | `/reports` | **S** | **P1** |
| **GAP-08** | **Athlete Profile Tab Consolidation** | 11 tabs cause severe navigation sprawl. Consolidate into 6–7 logical groups (e.g. merge `Program` + `Workouts` into "Training"; merge `Measurements` + `Photos` + `Assessments` + `Goals` into "Progress & Analytics"). | `/clients/[id]` | **L** | **P2** |
| **GAP-09** | **Athlete Self-Logging on Profile** | Allow athletes to log their daily body weight directly on `MeasurementsTab.tsx` without requiring admin/coach intervention. | `/clients/[id]` | **S** | **P2** |
| **GAP-10** | **Public vs Internal Coach Profile Sync** | Provide a one-click sync or preview between `CoachProfile.bio` and `PublicCoachProfile.publicBio` in `/admin-public/coaches` to prevent CMS drift. | `/admin-public/coaches` | **S** | **P2** |

---

## Audit Sign-off
- **Files Inspected on Disk:**
  - `src/app/clients/[id]/page.tsx`
  - `src/components/clients/CheckInsTab.tsx`
  - `src/components/clients/MeasurementsTab.tsx`
  - `src/components/clients/PhotosTab.tsx`
  - `src/components/clients/GoalsTab.tsx`
  - `src/components/clients/NotesTab.tsx`
  - `src/components/clients/NutritionTab.tsx`
  - `src/components/clients/WorkoutsTab.tsx`
  - `src/components/clients/AssessmentsTab.tsx`
  - `src/components/clients/MedicalTab.tsx`
  - `src/components/clients/CoachesTab.tsx`
  - `src/app/coaches/page.tsx`
  - `src/app/coaches/[id]/page.tsx` (confirmed absent)
  - `src/app/dashboard/page.tsx`
  - `src/app/reports/page.tsx`
  - `src/app/admin-public/coaches/page.tsx`
  - `src/server/services/client.service.ts`
  - `src/server/services/monitoring.service.ts`
- **Git Working Tree:** Clean (`6e3b5c0` on `main`).
- **Policy Enforcement:** Strict read-only audit. No application code altered, no git push executed, no Phase 10 initiated.
