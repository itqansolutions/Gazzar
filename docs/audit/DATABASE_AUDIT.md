# GX Academy – Database Architecture & Prisma Audit Report

**Audit Date:** 2026-11-01  
**Auditor Role:** Senior Software Architect & Database Engineer  
**Database Engine:** PostgreSQL  
**ORM:** Prisma ORM 5.22.0  
**Schema Path:** [`prisma/schema.prisma`](file:///d:/Gazzar%20Project/prisma/schema.prisma)  

---

## 1. Executive Summary

The database layer of GX Academy was evaluated from two distinct perspectives:
1. **Schema Design Quality:** The relational schema in `prisma/schema.prisma` is well-modeled, domain-rich, and cleanly structured across 23 models and 14 enums.
2. **Runtime Operational Status:** **The database is completely dormant at runtime.** No application code queries PostgreSQL or PrismaClient. The application runs strictly against browser `localStorage` (`gx_db_v1`) through an in-memory class (`CoachingStore` in `src/lib/db.ts`).

---

## 2. Complete Inventory of Models and Entities

The schema defines **23 relational models**:

| # | Model Name | Mapping Table | Primary Key | Description |
|---|---|---|---|---|
| 1 | `User` | `users` | `id` (UUID) | System user identity (Admin, Head Coach, Coach, Client) |
| 2 | `CoachProfile` | `coach_profiles` | `id` (UUID) | Coach metadata, specialties, experience, head-coach hierarchy |
| 3 | `ClientProfile` | `client_profiles` | `id` (UUID) | Athlete biographical, physical stats, membership status |
| 4 | `ClientCoachAssignment` | `client_coach_assignments` | `id` (UUID) | Join model connecting Athlete to primary/assistant coaches |
| 5 | `Sport` | `sports` | `id` (UUID) | Sports taxonomy (Bodybuilding, Swimming, Padel, Running...) |
| 6 | `MuscleGroup` | `muscle_groups` | `id` (UUID) | Anatomical muscle targeting (Chest, Back, Quads...) |
| 7 | `Equipment` | `equipment` | `id` (UUID) | Training apparatus (Barbell, Dumbbell, Cables...) |
| 8 | `Exercise` | `exercises` | `id` (UUID) | Exercise bank with video URLs, instructions, contraindications |
| 9 | `WorkoutTemplate` | `workout_templates` | `id` (UUID) | Pre-configured single-session workout templates |
| 10 | `WorkoutTemplateExercise` | `workout_template_exercises` | `id` (UUID) | Exercise items within a template (sets, reps, rest tempo) |
| 11 | `TrainingProgram` | `training_programs` | `id` (UUID) | Multi-week periodized training programs |
| 12 | `ProgramWeek` | `program_weeks` | `id` (UUID) | Weekly periodization block within a training program |
| 13 | `ProgramDay` | `program_days` | `id` (UUID) | Daily training slot within a program week |
| 14 | `ProgramWorkout` | `program_workouts` | `id` (UUID) | Workout template reference inside a program day |
| 15 | `ClientWorkoutAssignment` | `client_workout_assignments` | `id` (UUID) | Scheduled workout instance assigned to an athlete on a date |
| 16 | `WorkoutLog` | `workout_logs` | `id` (UUID) | Execution record of an assigned workout (duration, RPE) |
| 17 | `WorkoutExerciseLog` | `workout_exercise_logs` | `id` (UUID) | Exercise log within a completed workout |
| 18 | `SetLog` | `set_logs` | `id` (UUID) | Set-by-set performance (actual weight, actual reps, RPE) |
| 19 | `ClientMeasurementHistory`| `client_measurement_histories` | `id` (UUID) | Time-series anthropometric measurements (Weight, Fat%, BMI) |
| 20 | `ClientGoal` | `client_goals` | `id` (UUID) | Target milestones (Weight loss, Muscle gain, 1RM strength) |
| 21 | `ClientMedicalRestriction`| `client_medical_restrictions`| `id` (UUID) | Clinical safety constraints (Joint injuries, medical conditions) |
| 22 | `ClientProgressPhoto` | `client_progress_photos` | `id` (UUID) | Front/side/back transformation photography records |
| 23 | `ClientAssessment` | `client_assessments` | `id` (UUID) | Physical testing benchmarks (Pushups, VO2 Max, Plank) |
| 24 | `SessionCalendar` | `session_calendars` | `id` (UUID) | Coaching calendar sessions (Individual, Group, Assessment) |
| 25 | `SessionAttendance` | `session_attendances` | `id` (UUID) | Attendance register (Present, Absent, Late, Excused) |
| 26 | `MealPlan` | `meal_plans` | `id` (UUID) | Diet specifications (Calories, Protein, Carbs, Fats, Water) |
| 27 | `Membership` | `memberships` | `id` (UUID) | Billing, plan packages, payment statuses, balances |
| 28 | `ClientNote` | `client_notes` | `id` (UUID) | Technical coaching notes (Private or Client-visible) |
| 29 | `Notification` | `notifications` | `id` (UUID) | Internal notifications inbox |
| 30 | `AuditLog` | `audit_logs` | `id` (UUID) | Security and operations audit trail |

---

## 3. Relationship Architecture & Foreign Keys

### 3.1 One-to-One Relationships
- `User` <-> `CoachProfile`: Enforced via `@unique` on `CoachProfile.userId`.
- `User` <-> `ClientProfile`: Enforced via `@unique` on `ClientProfile.userId`.
- `ClientWorkoutAssignment` <-> `WorkoutLog`: Enforced via `@unique` on `WorkoutLog.assignmentId`.

### 3.2 Hierarchical & Self-Referencing Relationships
- `CoachProfile` has a self-relation representing the coaching hierarchy:
  ```prisma
  headCoachId        String?
  headCoach          CoachProfile?  @relation("HeadCoachSubordinates", fields: [headCoachId], references: [id])
  subordinateCoaches CoachProfile[] @relation("HeadCoachSubordinates")
  ```

### 3.3 Many-to-Many Join Models
- Athlete to Coach assignments use an explicit join model `ClientCoachAssignment` with a composite unique index:
  ```prisma
  @@unique([clientId, coachId])
  ```
  This cleanly prevents duplicate coach assignments while maintaining role attribution (`PRIMARY`, `ASSISTANT`, `NUTRITIONIST`, `PHYSIOTHERAPIST`).
- Session attendance uses an explicit join model `SessionAttendance` with:
  ```prisma
  @@unique([sessionId, clientId])
  ```

### 3.4 Deep Cascading Hierarchy
Workout tracking cascades down 4 tiers:
`WorkoutTemplate` -> `WorkoutTemplateExercise`
`TrainingProgram` -> `ProgramWeek` -> `ProgramDay` -> `ProgramWorkout`
`WorkoutLog` -> `WorkoutExerciseLog` -> `SetLog`

---

## 4. Cascading Delete Behavior & Referential Integrity

### 4.1 Safe Cascade Deletions
- When a `User` is deleted: `CoachProfile` and `ClientProfile` are deleted with `onDelete: Cascade`.
- When a `ClientProfile` is deleted: all related `measurements`, `goals`, `medicalRestrictions`, `progressPhotos`, `assessments`, `workoutAssignments`, `workoutLogs`, `attendances`, `mealPlans`, `memberships`, and `notes` are deleted via `onDelete: Cascade`.
- When a `WorkoutLog` is deleted: related `WorkoutExerciseLog` and child `SetLog` items are cleaned up via `onDelete: Cascade`.

### 4.2 Potential Foreign Key Constraint Risks
- **`Exercise` Deletions:** If an `Exercise` is referenced in historical `WorkoutExerciseLog` or existing `WorkoutTemplateExercise`, deleting the master exercise record will fail with a foreign key violation or leave orphaned associations.
  *Recommendation:* Implement soft deletion (`isActive Boolean @default(true)`) on `Exercise`, `Sport`, and `WorkoutTemplate`.
- **`AuditLog` User Retention:** `AuditLog.userId` safely uses `onDelete: SetNull`, preserving historical event logs even if a staff account is deleted.

---

## 5. Indexes and Query Performance Analysis

### 5.1 Existing Indexes
- Unique constraints exist on `User.email`, `CoachProfile.userId`, `ClientProfile.userId`, `MuscleGroup.code`, `ClientCoachAssignment(clientId, coachId)`, `SessionAttendance(sessionId, clientId)`, and `WorkoutLog.assignmentId`.

### 5.2 Missing Indexes on High-Traffic Query Paths
When PostgreSQL is connected, the following query paths will experience sequential table scans without added indexes:

1. **`ClientProfile` Status & Sport Queries:**
   - Missing index on `ClientProfile(status)` and `ClientProfile(preferredSportId)`.
2. **`ClientWorkoutAssignment` Scheduling:**
   - Missing composite index on `ClientWorkoutAssignment(clientId, scheduledDate, status)`.
3. **`SessionCalendar` Date Range Lookups:**
   - Missing composite index on `SessionCalendar(coachId, startTime, endTime)`.
4. **`AuditLog` Timeline Scanning:**
   - Missing index on `AuditLog(createdAt DESC)` and `AuditLog(entityType, entityId)`.
5. **`Membership` Expiration Alerting:**
   - Missing index on `Membership(endDate, paymentStatus)`.

---

## 6. Schema Consistency vs. Runtime Discrepancies

1. **Password Property Inconsistency:**
   - In `prisma/schema.prisma` line 135: `User` model declares `passwordHash String`.
   - In `src/types/index.ts` line 49: `User` interface declares `password?: string`.
   - In runtime data fixtures: passwords are stored unhashed as `password: "[REDACTED_DEFAULT_PASSWORD]"`.
2. **PostgreSQL Connection String Configuration:**
   - In `.env` line 1: `DATABASE_URL` is set to an internal Railway domain (`postgres.railway.internal:5432/railway`), which is unreachable in local development or any external environment.
3. **Unexecuted Migration Status:**
   - `prisma/seed.js` is an empty 2-line placeholder. The database has never been seeded with default athletic taxonomy, muscle groups, or sports catalogs.
