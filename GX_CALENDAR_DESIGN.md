# GX Platform — Calendar & Sessions Design Specification (Phase 6 Scope)
> **Status:** Proposal & Design Document Only — READ-ONLY / NO CODE MODIFICATIONS  
> **Target Phase:** Phase 6 (Calendar & Sessions Integration)  
> **Author:** Antigravity (AI Architect)  
> **Date:** November 17, 2026  

---

## Executive Summary & Context

Per the owner's strategic decisions:
1. **Semantic Purpose:** A `SessionCalendar` row represents an **Event** (a championship, an intensive camp, or a group class / general clinic) — **not** a granular workout routine with sets, reps, and exercises.
2. **Authoring Model:** Sessions and events are scheduled **exclusively** by `COACH`, `HEAD_COACH`, or `ADMIN`. Athletes do **not** self-register or create sessions.
3. **Attendance Interface:** The existing `/attendance` screen is functionally sufficient for tracking check-ins and statuses (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`). No redundant attendance UI is required.
4. **Calendar Unification:** The `/calendar` screen must present both macro **Academy Events** (`SessionCalendar`) and micro **Athlete Workouts** (`ClientWorkoutAssignment`) side-by-side on a unified monthly/weekly calendar grid, clearly differentiated visually and functionally, **without** merging their database schemas.

---

## 1. Session Types & Schema Adjustments

### 1.1 Existing Schema Audit
Currently, `SessionCalendar` in `prisma/schema.prisma` is defined as:
```prisma
model SessionCalendar {
  id              String       @id @default(uuid())
  coachId         String
  coach           CoachProfile @relation(fields: [coachId], references: [id])
  sportId         String       // Currently mandatory (Foreign Key to Sport)
  sport           Sport        @relation(fields: [sportId], references: [id])
  title           String
  sessionType     SessionType  @default(INDIVIDUAL) // Enum: INDIVIDUAL, GROUP, ASSESSMENT, RECOVERY
  startTime       DateTime
  endTime         DateTime
  location        String?
  maxParticipants Int          @default(1)

  attendances     SessionAttendance[]

  @@map("session_calendars")
}
```

### 1.2 Evaluation: Existing `SessionType` vs. Dedicated `eventType`
The existing `SessionType` enum contains: `[INDIVIDUAL, GROUP, ASSESSMENT, RECOVERY]`.
Given that workouts are handled by `ClientWorkoutAssignment` and fitness assessments are handled by `ClientAssessment`, keeping `INDIVIDUAL` or `ASSESSMENT` as calendar sessions creates conceptual clutter.

#### Recommended Proposal: Additive Enum Expansion
To avoid breaking backward compatibility or running complex schema migrations, we recommend:
1. **Additive enum update:** Expand `SessionType` (or add a nullable `eventType` enum):
   ```prisma
   enum EventType {
     GROUP_CLASS      // e.g. "CrossFit Conditioning / Morning Drills"
     CHAMPIONSHIP     // e.g. "National Swimming Championship 2026"
     CAMP             // e.g. "Summer High-Performance Intensive Camp"
     SEMINAR_WORKSHOP // e.g. "Sports Nutrition & Anti-Doping Seminar"
     GENERAL_EVENT    // e.g. "Annual Academy Award Ceremony"
   }
   ```
2. **Schema Enhancements (Strictly Additive & Non-Breaking):**
   - `sportId String?` $\rightarrow$ **Make nullable**: A championship, seminar, or general academy camp can be multi-sport or general academy-wide, so requiring a specific `sportId` is overly restrictive.
   - `eventType EventType @default(GROUP_CLASS)`: Explicit event classification.
   - `eventMode EventMode @default(ONLINE)`: Delivery mode (`ONLINE` / `IN_PERSON`, with `HYBRID` reserved for later).
   - `onlineLink String?`: URL for meeting/webinar (e.g., Zoom, Google Meet, YouTube Live) when `eventMode` is `ONLINE`.
   - `location String?`: Kept for in-person events (e.g., venue name, stadium, room, or external complex address).
   - `description String?`: Contextual notes for the event (e.g. equipment needed, syllabus, instructions).
   - `audienceScope AudienceScope @default(WHOLE_ACADEMY)`: Target audience definition.
   - `isAllDay Boolean @default(false)`: For multi-day championships or full-day camps.

```prisma
enum EventMode {
  ONLINE
  IN_PERSON
  // HYBRID (reserved for future phase)
}
```

---

## 2. Audience Model

### 2.1 The Problem
How does a scheduled event reach "the people in it" without generating dozens or hundreds of phantom assignment rows for non-workout events?

### 2.2 Current `SessionAttendance` Pattern
Currently, `SessionService.createSession` accepts an optional `clientIds?: string[]`. When provided, it eagerly creates `SessionAttendance` records with `status = PRESENT`. This works for a small list of 5 athletes in a personal training class, but fails for a 150-athlete championship or academy-wide camp.

### 2.3 Proposed Audience Scope
We define 4 declarative audience scopes on `SessionCalendar`:

| Audience Scope | Definition | Target Resolution Logic |
| :--- | :--- | :--- |
| **`WHOLE_ACADEMY`** | Open to all registered athletes across all sports. | Appears on every active athlete's calendar automatically. |
| **`BY_SPORT`** | Specific to athletes enrolled in the session's `sportId`. | Query matches `clientProfile.preferredSportId == session.sportId`. |
| **`COACH_ROSTER`** | Specific to athletes assigned to the organizing coach. | Query matches `ClientCoachAssignment.coachId == session.coachId`. |
| **`SELECTED_ATHLETES`** | A curated, explicit list of invited/eligible athletes. | Only athletes explicitly linked via `SessionAttendance` or ID list. |

### 2.4 Attendance Generation Rule (Lazy Upsert)
- **Do NOT generate dummy rows:** For `WHOLE_ACADEMY`, `BY_SPORT`, and `COACH_ROSTER`, no initial `SessionAttendance` rows are created in the database when the event is scheduled.
- **On `/attendance` Screen:** The system dynamically lists eligible athletes based on the event's `audienceScope`.
- **Marking Attendance:** When the coach checks off an athlete (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`), a `SessionAttendance` row is lazily upserted into `session_attendances`.
- **Zero bloat:** Database stays clean and free of unverified ghost records.

---

## 3. Creation UI (/calendar Modal)

### 3.1 Entry Point
- A primary button placed in the `/calendar` header: **`+ Schedule Event / Class`** (`+ إنشاء حدث / حصة`).
- Visible exclusively to: `ADMIN`, `HEAD_COACH`, `COACH`.

### 3.2 Form Layout (Lightweight Single-Screen Modal)
Unlike the deep workout builder, event creation is fast and compact (takes $< 30$ seconds):

```
┌────────────────────────────────────────────────────────────────────────┐
│  🏆 Schedule Academy Event / Group Class                               │
├────────────────────────────────────────────────────────────────────────┤
│  Title (English) *        : [ Cairo Open Youth Championship 2026     ] │
│  Title (Arabic)           : [ بطولة القاهرة المفتوحة للناشئين         ] │
│  Event Type *             : [ 🏆 Championship ▾ ]                      │
│  Sport                    : [ Swimming ▾ ] (or "All Sports / General") │
│                                                                        │
│  Date *                   : [ 2026-12-05 ]                             │
│  Start Time *             : [ 09:00 AM ]    End Time *: [ 02:00 PM ]   │
│  All-Day Event?           : [ ] Check if multi-hour/full-day           │
│  Location                 : [ Olympic Swimming Complex, Nasr City    ] │
│                                                                        │
│  Audience Scope *         : [ (●) Whole Academy  ( ) By Sport          │
│                               ( ) My Roster      ( ) Select Athletes ] │
│  Max Capacity             : [ 50 ] (Optional)                          │
│  Notes / Description      : [ Bring formal race suit and ID card...  ] │
├────────────────────────────────────────────────────────────────────────┤
│  [ Cancel ]                                       [ Save Event 🎯 ]    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Calendar Rendering & Unified Display

### 4.1 Strict Conceptual Separation
`SessionCalendar` and `ClientWorkoutAssignment` serve fundamentally different needs:
- `SessionCalendar` = **Group event / gathering** (where, when, who is hosting).
- `ClientWorkoutAssignment` = **Personal athletic execution** (what sets, reps, tempo, and loads to perform).

### 4.2 Visual Differentiation on `/calendar`

```
┌────────────────────────────────────────────────────────────────────────┐
│  /calendar — Filter Bar:                                               │
│  [ Show All ]  [ 🏆 Events & Classes (4) ]  [ 🏋️ Workouts (18) ]       │
├────────────────────────────────────────────────────────────────────────┤
│  December 5, 2026 (Example Day Cell):                                  │
│                                                                        │
│  ┌─ EVENT (Solid Accent Banner, Crimson/Purple) ─────────────────────┐ │
│  │ 🏆 09:00 AM · Cairo Championship (Swimming)                       │ │
│  │ Coach: Abdalla Elgazzar • Location: Olympic Complex               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─ WORKOUT (Outlined Pill / Status Dot) ────────────────────────────┐ │
│  │ 🟢 Ahmed Karam: Upper Body Hypertrophy (8 exercises)               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│  ┌─ WORKOUT (Outlined Pill / Scheduled Dot) ─────────────────────────┐ │
│  │ 🔵 Menna Hossam: 5km Aerobic Pace Run                              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Click-Through Behaviors

| Role | Clicking an Event (`SessionCalendar`) | Clicking a Workout (`ClientWorkoutAssignment`) |
| :--- | :--- | :--- |
| **Coach / Admin** | Opens **Event Summary Drawer** with deep link: `[ Manage Attendance 📋 ]` $\rightarrow$ navigates directly to `/attendance?sessionId=${id}`. | Opens **Workout Details Modal** (view exercise list, prescribed loads) with link to edit/reassign in `/assignments`. |
| **Athlete** | Opens **Event Details View** (Title, time, coach, location, directions, description). | Deep links directly to **Execution Screen** (`/workout/${id}/execute` or `/assignments`). |

---

## 5. API Contracts & Architecture

### 5.1 Unified Calendar Query: `GET /api/calendar`
Instead of forcing the frontend to execute multiple out-of-sync API requests, a single consolidated endpoint returns calendar items for the requested date window:

```http
GET /api/calendar?startDate=2026-12-01&endDate=2026-12-31&sportId=ALL&view=ALL
```

#### Response Structure:
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "sess_123",
        "title": "Cairo Youth Championship 2026",
        "eventType": "CHAMPIONSHIP",
        "sportId": "sport_swim_01",
        "sportName": "Swimming",
        "coachName": "Abdalla Elgazzar",
        "startTime": "2026-12-05T09:00:00.000Z",
        "endTime": "2026-12-05T14:00:00.000Z",
        "location": "Olympic Swimming Complex",
        "audienceScope": "BY_SPORT",
        "attendeeCount": 24,
        "maxParticipants": 50
      }
    ],
    "workouts": [
      {
        "id": "asgn_456",
        "title": "Upper Body Hypertrophy A",
        "scheduledDate": "2026-12-05",
        "status": "SCHEDULED",
        "athleteId": "client_akaram",
        "athleteName": "Ahmed Karam",
        "coachName": "Coach Mohamed",
        "exerciseCount": 7,
        "sourceType": "TEMPLATE"
      }
    ]
  }
}
```

### 5.2 Event Creation: `POST /api/sessions`
Extends the existing endpoint with clean validation:
```typescript
interface CreateSessionPayload {
  title: string;
  eventType: "GROUP_CLASS" | "CHAMPIONSHIP" | "CAMP" | "SEMINAR_WORKSHOP" | "GENERAL_EVENT";
  sportId?: string | null;
  coachId?: string;
  startTime: string; // ISO date-time
  endTime: string;   // ISO date-time
  isAllDay?: boolean;
  location?: string;
  maxParticipants?: number;
  audienceScope: "WHOLE_ACADEMY" | "BY_SPORT" | "COACH_ROSTER" | "SELECTED_ATHLETES";
  clientIds?: string[]; // Required only if audienceScope === "SELECTED_ATHLETES"
  description?: string;
}
```

---

## 6. Explicitly Out of Scope (Phase 6 Scoping)

The following capabilities are **intentionally excluded** from this phase to keep the platform lean and avoid unnecessary complexity:
1. ❌ **Athlete Self-Registration / RSVP:** Athletes cannot reserve slots or cancel bookings independently.
2. ❌ **Recurring / Repeating Sessions:** No automated recurrence rules (e.g. "every Mon/Wed for 8 weeks") in v1.
3. ❌ **Event Ticketing & Payments:** No payment gate, tickets, or fee collection for championships.
4. ❌ **Push / SMS / WhatsApp Reminders:** Automated notification dispatchers are deferred.
5. ❌ **Granular Exercise Execution Inside Events:** Group events do not log individual set weights or heart rate intervals; workouts remain in `ClientWorkoutAssignment`.

---

## 7. Open Questions for Owner Alignment

1. **Sport Binding:** Should `sportId` on events be optional (`nullable`) so general academy events (annual celebrations, nutrition workshops, general athletic testing camps) can exist without being tied to a single sport? *(Recommendation: Yes, make `sportId` nullable).*
2. **Coach Workouts Visibility:** When a Coach logs into `/calendar`, should they see **all** academy athlete workouts, or **only** workouts belonging to athletes assigned to them? *(Recommendation: Default to their own assigned athletes, with an "All Academy Athletes" toggle for Admin/Head Coach).*
3. **Championship Results:** If a session is marked as `CHAMPIONSHIP`, do you want coaches to record athlete rank/medals later, or is simple Attendance (`PRESENT`/`ABSENT`) sufficient for now? *(Recommendation: Keep simple attendance for now).*

---

## 8. Addendum: Clarifications for Phase 6 Implementation

### 8.1 Audience Model: `BY_SPORT` Query & Distribution Logic
**Question:** For `audienceModel = BY_SPORT`, does the event auto-appear on every athlete in that sport's calendar, or does the coach still need to pick specific athletes?  
**Answer & Specification:**  
The event **automatically appears** on the calendar of every active athlete registered for that sport (`clientProfile.preferredSportId == session.sportId`). The coach does **not** need to pick individual athletes (if the coach wanted to hand-pick specific athletes within a sport, they would select `audienceScope = SELECTED_ATHLETES`).

#### Exact Prisma Query Logic for `GET /api/calendar?athleteId=${id}`:
```typescript
// 1. Fetch athlete context
const athlete = await prisma.clientProfile.findUnique({
  where: { id: athleteId },
  select: {
    id: true,
    preferredSportId: true,
    coachAssignments: { select: { coachId: true } }
  }
});

const coachIds = athlete?.coachAssignments.map((ca) => ca.coachId) || [];

// 2. Query visible SessionCalendar events for this specific athlete
const events = await prisma.sessionCalendar.findMany({
  where: {
    startTime: { gte: periodStart, lte: periodEnd },
    OR: [
      // A. Events open to the entire academy
      { audienceScope: "WHOLE_ACADEMY" },
      // B. Events targeting the athlete's registered sport
      ...(athlete?.preferredSportId
        ? [{ audienceScope: "BY_SPORT", sportId: athlete.preferredSportId }]
        : []),
      // C. Events targeting the athlete's assigned coaches
      ...(coachIds.length > 0
        ? [{ audienceScope: "COACH_ROSTER", coachId: { in: coachIds } }]
        : []),
      // D. Events where the athlete was explicitly selected
      {
        audienceScope: "SELECTED_ATHLETES",
        attendances: { some: { clientId: athleteId } }
      }
    ]
  },
  include: {
    coach: { include: { user: { select: { name: true, avatar: true } } } },
    sport: { select: { id: true, nameEn: true, nameAr: true } }
  },
  orderBy: { startTime: "asc" }
});
```

### 8.2 Location Modeling: Free-Text vs. Structured Facility/Room
**Status:** In the current schema (`prisma/schema.prisma:890`), `location` is a single free-text field (`String?`, e.g. `"GX Main Gym Floor"`, `"Olympic Swimming Complex, Nasr City"`).  
**Owner Decision Needed:**  
Does GX Academy operate across multiple fixed branches, studios, or designated rooms (e.g. Branch A / Boxing Ring / Hall 1) that should be modeled as a structured reference or enum, or is a free-text location field sufficient for scheduling and directions? (Currently flagged for owner confirmation before Phase 6 implementation).

---

## 9. Design Addendum: Resolution of Open Questions (Pre-Phase 6)

### 9.1 `audienceScope = BY_SPORT` Operational Behavior & Query Logic
1. **Behavior:**
   - For `audienceScope = "BY_SPORT"`, the event **automatically appears** on the calendar for **every athlete** registered in that sport (`clientProfile.preferredSportId == session.sportId`).
   - The coach does **not** pick specific athletes. This is designed for open team practices, sport-specific clinics, and sport camps.
   - If a coach wishes to target only a subset of athletes within a sport, they select **`SELECTED_ATHLETES`** instead and use the sport filter in the athlete picker modal to choose specific athletes.

2. **Exact Query Logic (`GET /api/calendar?athleteId={id}`):**
   ```ts
   // Step 1: Resolve athlete's preferred sport and assigned coach IDs
   const athlete = await prisma.clientProfile.findUnique({
     where: { id: athleteId },
     select: {
       preferredSportId: true,
       coachAssignments: { select: { coachId: true } }
     }
   });
   const assignedCoachIds = athlete?.coachAssignments.map((ca) => ca.coachId) || [];

   // Step 2: Query visible SessionCalendar events in date window [startDate, endDate]
   const athleteEvents = await prisma.sessionCalendar.findMany({
     where: {
       startTime: { gte: startDate, lte: endDate },
       OR: [
         // A. Open to all athletes in the academy
         { audienceScope: "WHOLE_ACADEMY" },
         // B. Auto-visible to all athletes in this sport
         ...(athlete?.preferredSportId
           ? [{ audienceScope: "BY_SPORT", sportId: athlete.preferredSportId }]
           : []),
         // C. Auto-visible to all athletes trained by this coach
         ...(assignedCoachIds.length > 0
           ? [{ audienceScope: "COACH_ROSTER", coachId: { in: assignedCoachIds } }]
           : []),
         // D. Explicitly selected athlete list
         {
           audienceScope: "SELECTED_ATHLETES",
           attendances: { some: { clientId: athleteId } }
         }
       ]
     },
     include: {
       coach: { include: { user: { select: { name: true, avatar: true } } } },
       sport: { select: { id: true, nameEn: true, nameAr: true } }
     },
     orderBy: { startTime: "asc" }
   });
   ```

### 9.2 Location Field: Structured vs. Free Text
- **Architectural Baseline:** Free text (`location: String?`) is currently implemented in schema and flexible for varied off-site venues (competitions, stadiums, tracks).
- **Direct Question to the Owner:** Does GX Academy need a formal structured model (e.g., `Branch` / `Room` / `Facility` table or enum like `MAIN_BRANCH_FLOOR_A`, `RECOVERY_ZONE`) to prevent room scheduling conflicts, or is the flexible `String?` field sufficient for your operational needs?

### 9.3 Delivery Mode: Online vs. In-Person (Owner Decision)
Per the owner's decision, academy sessions/events will mostly be **Online** (video consultations, tactical breakdowns, group workshops) with selective **In-Person** events (championships, physical camps, on-site testing):

1. **`eventMode` Enum:**
   - `ONLINE` (Default): For webinars, video workshops, remote consultations.
   - `IN_PERSON`: For on-site gym sessions, stadium competitions, physical testing.
   - *(Note: `HYBRID` reserved for future expansion).*

2. **Field Requirements & Dynamic UI Behavior:**
   - When `eventMode === "ONLINE"`:
     - `onlineLink` (String?, URL validation): Mandatory or recommended in UI (Zoom, Google Meet, Microsoft Teams, YouTube Live stream URL).
     - Athletes on `/calendar` see a direct `[ Join Session 🎥 ]` action button opening `onlineLink`.
     - `location` field is optional or automatically displays `"Online (Video Meeting)"`.
   - When `eventMode === "IN_PERSON"`:
     - `location` (String?): Physical venue or facility address (e.g., `"Olympic Swimming Complex, Nasr City"`).
     - `onlineLink` is null.
     - Athletes on `/calendar` see a `[ View Location 📍 ]` / address card.



