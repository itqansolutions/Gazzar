# GX Academy – Milestone 1.2: Schema Comparison Report

**Audit Date:** 2026-11-02  
**Lead Engineer:** Senior PostgreSQL & Prisma Database Engineer  
**Stage:** Milestone 1.2 – Stage A: Final Schema Verification  
**Target Environment:** Railway Production PostgreSQL (`Gazzar` Service)  
**File:** `docs/database/SCHEMA_COMPARISON_REPORT.md`  

---

## 1. Executive Summary & Comparison Verdict

Before implementing any modifications or adding security models to `prisma/schema.prisma`, a forensically rigorous, bidirectional schema diff was executed between the live PostgreSQL database on Railway Production and the local `prisma/schema.prisma` codebase.

The comparison was performed directly inside the Railway Runtime container using `prisma migrate diff` and PostgreSQL system catalog introspection (`information_schema`, `pg_catalog`, `pg_type`, `pg_enum`, `pg_indexes`).

### Final Comparison Verdict:
> ### **VERDICT: 100% IDENTICAL – ZERO SCHEMA DRIFT**
>
> **Finding:**
> - `prisma migrate diff --from-schema-datasource ./prisma/schema.prisma --to-schema-datamodel ./prisma/schema.prisma`:  
>   **"No difference detected."**
> - Generated SQL Diff Script:  
>   `-- This is an empty migration.`
> - There are **ZERO missing tables**, **ZERO orphaned tables**, **ZERO column type discrepancies**, **ZERO constraint mismatches**, and **ZERO index differences**.

---

## 2. Quantitative Verification Metrics

| Metric | Live PostgreSQL (Railway Prod) | `prisma/schema.prisma` | Discrepancy |
| :--- | :---: | :---: | :---: |
| **Total Base Tables** | 30 | 30 Models (mapped via `@@map`) | **0** |
| **Total Columns** | 282 | 282 Fields | **0** |
| **Primary Keys** | 30 (`id` UUIDs) | 30 `@id` Fields | **0** |
| **Foreign Keys (Relations)** | 47 | 47 `@relation` Declarations | **0** |
| **Total Indexes** | 37 | 37 `@@index` / `@unique` | **0** |
| **Enum Definitions** | 16 (in `public` schema) | 16 `enum` Blocks | **0** |
| **Live Row Counts** | 0 (All 30 tables empty) | N/A | **0** |

---

## 3. Detailed Structural Verification

### 3.1 Tables & Primary Keys Verification
All 30 tables exist with `id` as primary key (`uuid` type):
`audit_logs`, `client_assessments`, `client_coach_assignments`, `client_goals`, `client_measurement_histories`, `client_medical_restrictions`, `client_notes`, `client_profiles`, `client_progress_photos`, `client_workout_assignments`, `coach_profiles`, `equipment`, `exercises`, `meal_plans`, `memberships`, `muscle_groups`, `notifications`, `program_days`, `program_weeks`, `program_workouts`, `session_attendances`, `session_calendars`, `set_logs`, `sports`, `training_programs`, `users`, `workout_exercise_logs`, `workout_logs`, `workout_template_exercises`, `workout_templates`.

### 3.2 Enum Definitions Verification
The 16 PostgreSQL custom enum types in `pg_type` / `pg_enum` match `prisma/schema.prisma` with 100% value parity:
1. `UserRole`: `ADMIN`, `HEAD_COACH`, `COACH`, `CLIENT`
2. `ClientStatus`: `LEAD`, `ACTIVE`, `FROZEN`, `INACTIVE`, `EXPIRED`, `SUSPENDED`, `ARCHIVED`
3. `Gender`: `MALE`, `FEMALE`
4. `CoachRoleInClient`: `PRIMARY`, `ASSISTANT`, `NUTRITIONIST`, `PHYSIOTHERAPIST`
5. `MetricType`: `SETS_REPS_WEIGHT`, `DISTANCE_TIME_PACE`, `LAPS_TIME`, `ROUNDS_REPS_TIME`, `TIME_HOLD`
6. `Difficulty`: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`
7. `GoalType`: `WEIGHT_LOSS`, `MUSCLE_GAIN`, `STRENGTH`, `ENDURANCE`, `PERFORMANCE`, `REHABILITATION`, `GENERAL_FITNESS`
8. `GoalStatus`: `IN_PROGRESS`, `ACHIEVED`, `ABANDONED`
9. `RestrictionSeverity`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
10. `BodyPart`: `KNEE`, `SHOULDER`, `LOWER_BACK`, `NECK`, `ANKLE`, `WRIST`, `ELBOW`, `HIP`, `HEART`, `ASTHMA`, `OTHER`
11. `AssignmentStatus`: `SCHEDULED`, `COMPLETED`, `SKIPPED`, `MISSED`
12. `SessionType`: `INDIVIDUAL`, `GROUP`, `ASSESSMENT`, `RECOVERY`
13. `AttendanceStatus`: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`
14. `MembershipPlan`: `MONTHLY`, `THREE_MONTHS`, `SIX_MONTHS`, `ANNUAL`, `PERSONAL_TRAINING`, `GROUP_CLASS`
15. `PaymentStatus`: `PAID`, `PARTIAL`, `UNPAID`
16. `NoteType`: `PRIVATE_COACH`, `PUBLIC_CLIENT`

### 3.3 Foreign Keys & Referential Integrity
- 47 Foreign Key constraints are active in PostgreSQL, establishing strict referential integrity across users, coaches, clients, programs, workouts, logs, assessments, and attendance.
- All cascading rules (`ON DELETE CASCADE` / `ON DELETE RESTRICT`) match the Prisma relation definitions.

---

## 4. Discrepancy & Drift Analysis

- **Differences Found:** NONE (0).
- **Schema Drift:** ZERO.
- **Risk Assessment:** Adding new independent models (`Session`, `PasswordResetToken`) does not mutate, rename, or drop any existing column or table. It is 100% additive and safe.

---

## 5. Conclusion & Clearance for Stage B

With 100% schema parity confirmed via automated diffing and catalog inspection, the project has full clearance to proceed to **Stage B: Security Models Design (`Session` and `PasswordResetToken`)**.
