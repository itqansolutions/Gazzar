# GX Academy – Authorization & Data Ownership Architecture Matrix

**Document Version:** 2.0.0  
**Status:** Approved Technical Design  
**Author:** Senior Security Architect  
**Objective:** Define strict server-side Role-Based Access Control (RBAC) and Resource-Level Data Ownership (ABAC).  

---

## 1. Core Authorization Philosophy

In GX Academy, **role checking alone is insufficient**. A coach having the role `COACH` must not be able to view or edit athletes assigned to other coaches. Similarly, an athlete with the role `CLIENT` must be strictly confined to their own training programs, measurements, and progress photos.

### The Golden Rule:
> **"If an unauthorized coach or athlete alters the `ID` parameter in an API call or URL route, the server must reject the operation with HTTP 403 Forbidden or HTTP 404 Not Found, regardless of client-side UI behavior."**

---

## 2. Global Role-Based Permissions Matrix (Module Level)

| Business Module | System Admin (`ADMIN`) | Head Coach (`HEAD_COACH`) | Coach (`COACH`) | Athlete / Client (`CLIENT`) |
|---|:---:|:---:|:---:|:---:|
| **User Accounts** | Full CRUD | View Staff / Read-Only | None | None |
| **Coaching Staff** | Full CRUD | Manage Subordinates | View Directory | View Assigned Coach Profile |
| **Athletes Directory**| Full Access | Full Access (Department)| Assigned Athletes Only | Self Profile Only |
| **Sports & Taxonomy** | Full CRUD | Full CRUD | Read-Only | Read-Only |
| **Exercise Bank** | Full CRUD | Full CRUD | Create / Read / Edit | Read-Only (Assigned Exercises)|
| **Workout Templates** | Full CRUD | Full CRUD | Manage Own / Read All | None |
| **Training Programs** | Full CRUD | Full CRUD | Assign / Create Own | View Assigned Program |
| **Live Workout Execution**| Full Oversight| Full Oversight | Log on Behalf of Athlete| Execute & Log Own Workouts |
| **Medical Restrictions** | Full CRUD | Full Oversight | Manage for Assigned | View Own Restrictions |
| **Measurements & Goals** | Full CRUD | Full Oversight | Manage for Assigned | View Own / Record Weight |
| **Progress Photos** | Full Oversight| Full Oversight | View Assigned Athletes | Upload / View Own Photos |
| **Nutrition & Meal Plans**| Full CRUD | Full CRUD | Manage for Assigned | View Own Meal Plan |
| **Fitness Assessments** | Full CRUD | Full CRUD | Assess Assigned Athletes| View Own Benchmarks |
| **Calendar & Sessions** | Full CRUD | Manage Department | Manage Own Sessions | Book / View Own Sessions |
| **Session Attendance** | Full CRUD | Full Oversight | Mark for Own Sessions | View Own Attendance History |
| **Memberships & Billing**| Full CRUD | View Plan Status | View Plan Status | View Own Plan & Balance |
| **System Audit Logs** | Full Read | None | None | None |
| **Academy Settings** | Full CRUD | Read-Only | None | None |

---

## 3. Resource-Level Data Ownership Rules (ABAC)

### 3.1 Athlete / Client Boundary (`CLIENT`)
An authenticated athlete with session `clientId = "client-123"` has strict data isolation:
- **Measurements:** Can query only `WHERE clientId = "client-123"`.
- **Workout Assignments:** Can query and execute only `WHERE clientId = "client-123"`.
- **Meal Plans:** Can read only active meal plan `WHERE clientId = "client-123"`.
- **Progress Photos:** Cannot access photos where `clientId != "client-123"`.
- **Cross-Access Attempt:** If an athlete requests `GET /api/v1/clients/client-999` or `GET /api/v1/measurements?clientId=client-999`, the server immediately returns **HTTP 403 Forbidden**.

### 3.2 Coach Boundary (`COACH`)
An authenticated coach with session `coachId = "coach-456"`:
- Can access athlete records **only if an active relationship exists** in the `client_coach_assignments` join table:
  ```sql
  SELECT 1 FROM client_coach_assignments 
  WHERE coachId = 'coach-456' AND clientId = :targetClientId AND active = true;
  ```
- If Coach A attempts to fetch or mutate the medical records, workout logs, or private notes of Coach B's athlete by changing the URL ID, the server rejects the request with **HTTP 403 Forbidden**.
- **Exercise Library:** Can create and edit custom workout templates, but cannot delete academy-standard global templates created by the Head Coach or Admin.

### 3.3 Head Coach Boundary (`HEAD_COACH`)
An authenticated Head Coach with session `coachId = "headcoach-789"`:
- Can access all athletes assigned directly to them.
- Can access all athletes assigned to coaches who report to them via the hierarchy self-relation:
  ```sql
  SELECT 1 FROM coach_profiles 
  WHERE id = :targetCoachId AND headCoachId = 'headcoach-789';
  ```
- Can approve and publish training programs and review athletic assessments across their coaching division.

### 3.4 System Administrator (`ADMIN`)
- The administrator possesses universal administrative authority over all records in the academy.
- All mutating actions performed by an Administrator are written directly to the immutable `audit_logs` table.

---

## 4. Server-Side Enforcement Architecture

To guarantee that authorization rules cannot be bypassed, security checks are performed in the **Service Layer** via reusable, battle-tested assertions before any database query executes:

```typescript
// src/server/auth/authorization.ts
import { ForbiddenError, NotFoundError } from "@/server/errors";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface SecurityContext {
  userId: string;
  role: UserRole;
  coachId?: string;
  clientId?: string;
}

/**
 * Asserts that the authenticated user has legitimate legal authority
 * to view or modify the targeted client/athlete profile.
 */
export async function assertCanAccessClient(
  ctx: SecurityContext,
  targetClientId: string
): Promise<void> {
  // 1. System Admin has full academy authority
  if (ctx.role === "ADMIN") return;

  // 2. Athlete can access ONLY their own profile
  if (ctx.role === "CLIENT") {
    if (ctx.clientId !== targetClientId) {
      throw new ForbiddenError("Access denied: You can only access your own athlete profile.");
    }
    return;
  }

  // 3. Coach must have an active assignment to this athlete
  if (ctx.role === "COACH") {
    if (!ctx.coachId) throw new ForbiddenError("Coach identity not verified.");

    const assignment = await prisma.clientCoachAssignment.findFirst({
      where: {
        coachId: ctx.coachId,
        clientId: targetClientId,
        active: true
      }
    });

    if (!assignment) {
      throw new ForbiddenError("Access denied: This athlete is not assigned to your coaching roster.");
    }
    return;
  }

  // 4. Head Coach can access their own athletes or subordinate coaches' athletes
  if (ctx.role === "HEAD_COACH") {
    if (!ctx.coachId) throw new ForbiddenError("Head coach identity not verified.");

    const hasAccess = await prisma.clientCoachAssignment.findFirst({
      where: {
        clientId: targetClientId,
        active: true,
        OR: [
          { coachId: ctx.coachId },
          { coach: { headCoachId: ctx.coachId } }
        ]
      }
    });

    if (!hasAccess) {
      throw new ForbiddenError("Access denied: This athlete is outside your supervisory coaching tree.");
    }
    return;
  }

  throw new ForbiddenError("Unauthorized access.");
}
```

---

## 5. Defense Against Tampering Scenarios

| Attack Vector | Example Attack Scenario | Server-Side Defense Mechanism | HTTP Status |
|---|---|---|:---:|
| **IDOR (Insecure Direct Object Reference)** | Coach modifies `clientId` in URL to read medical injuries of another coach's athlete | `assertCanAccessClient()` queries `client_coach_assignments` and rejects unassigned access | **403 Forbidden** |
| **Vertical Privilege Escalation** | Athlete sends `POST /api/v1/exercises` to create an academy exercise | Middleware checks `ctx.role !== 'CLIENT'` and halts execution | **403 Forbidden** |
| **Self-Promotion Tampering** | User sends `PATCH /api/v1/users/[id]` with payload `{"role": "ADMIN"}` | User update schema strips `role` from non-admin payloads; only Admin can mutate user roles | **403 Forbidden** |
| **Session Hijacking via Stolen LocalStorage** | Attacker reads `localStorage` to copy auth state | LocalStorage contains zero auth tokens; sessions exist only in HttpOnly cookies | **401 Unauthorized** |
