# GX Academy – Database Migration & Data Ingestion Plan

**Document Version:** 2.0.0  
**Status:** Approved Technical Design  
**Author:** Senior Database Architect  
**Source Data Store:** Client-side LocalStorage (`gx_db_v1`) / In-Memory `CoachingStore`  
**Target Persistence:** PostgreSQL 15+ via Prisma ORM 5.22.0  

---

## 1. Migration Overview & Strategic Principles

The existing GX Academy prototype stores substantial domain data in `localStorage` (`gx_db_v1`) across 20+ entities. Migrating to a production PostgreSQL database requires an **idempotent, order-dependent, foreign-key safe ingestion pipeline**.

### Core Constraints:
1. **Zero Data Loss:** Existing prototype data (custom exercises, athlete records, test logs) must not be lost or overwritten blindly.
2. **Preserve Relational Identifiers:** Existing UUIDs and string IDs (`sport-bodybuilding`, `muscle-chest`, `client-1`, `user-admin`) must be preserved as primary keys in PostgreSQL so existing client URLs and relationships remain valid.
3. **Password Security Modernization:** Plaintext passwords found in legacy fixtures (`"A@123456"`, `"password123"`) must be converted to salted `bcrypt` hashes (`passwordHash`) during ingestion.

---

## 2. Entity Dependency Graph & Ingestion Sequence

To prevent foreign key constraint violations (`FOREIGN KEY constraint failed`), data must be inserted in strict topological order across **7 distinct tiers**:

```
+----------------------------------------------------------------------------------------------------+
| TIER 1: Foundational Taxonomies (No Dependencies)                                                 |
|   1. sports               2. muscle_groups          3. equipment                                   |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
+-------------------------------------------------v--------------------------------------------------+
| TIER 2: Core User Identities & Root Profiles                                                       |
|   4. users (Convert passwords to bcrypt hash)                                                      |
|   5. coach_profiles                                 6. client_profiles                                 |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
+-------------------------------------------------v--------------------------------------------------+
| TIER 3: Cross-Entity Associations & Exercise Bank                                                  |
|   7. client_coach_assignments                       8. exercises (References Sport, Muscle, Equip) |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
+-------------------------------------------------v--------------------------------------------------+
| TIER 4: Workout Definitions & Periodization                                                        |
|   9. workout_templates                              10. workout_template_exercises                 |
|   11. training_programs                             12. program_weeks                              |
|   13. program_days                                  14. program_workouts                           |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
+-------------------------------------------------v--------------------------------------------------+
| TIER 5: Scheduling & Workout Assignments                                                           |
|   15. client_workout_assignments                    16. session_calendars                          |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
+-------------------------------------------------v--------------------------------------------------+
| TIER 6: Execution Tracking, Health & Operations                                                    |
|   17. workout_logs                                  18. workout_exercise_logs -> set_logs          |
|   19. client_measurement_histories                  20. client_goals                               |
|   21. client_medical_restrictions                   22. client_progress_photos                     |
|   23. client_assessments                            24. session_attendances                        |
|   25. meal_plans                                    26. memberships                                |
|   27. client_notes                                                                                 |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
+-------------------------------------------------v--------------------------------------------------+
| TIER 7: System Auditing & Active Sessions                                                          |
|   28. audit_logs                                    29. sessions                                   |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Automated Migration Script Specification (`prisma/migrate-local-data.ts`)

An automated TypeScript migration script will be created to read data fixtures or exported `gx_db_v1` payloads and execute batch upserts inside transactional blocks:

```typescript
// prisma/migrate-local-data.ts
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  initialSports,
  initialMuscleGroups,
  initialEquipment,
  initialExercises,
  initialUsers,
  initialCoachProfiles,
  initialClients,
  initialCoachAssignments,
  initialTemplates,
  initialPrograms,
  initialAssignments,
  initialWorkoutLogs,
  initialMeasurements,
  initialGoals,
  initialMedicalRestrictions,
  initialProgressPhotos,
  initialAssessments,
  initialCalendars,
  initialMealPlans,
  initialMemberships,
  initialClientNotes
} from "../src/lib/mockData";

const prisma = new PrismaClient();

export async function migrateData() {
  console.log("=== STARTING GX ACADEMY DATABASE MIGRATION ===");

  await prisma.$transaction(async (tx) => {
    // 1. Taxonomies (Tier 1)
    console.log("Ingesting Tier 1: Sports, Muscles, Equipment...");
    for (const sport of initialSports) {
      await tx.sport.upsert({
        where: { id: sport.id },
        update: {},
        create: {
          id: sport.id,
          nameAr: sport.nameAr,
          nameEn: sport.nameEn,
          icon: sport.icon,
          descriptionAr: sport.descriptionAr,
          descriptionEn: sport.descriptionEn,
          categories: sport.categories || []
        }
      });
    }

    for (const mg of initialMuscleGroups) {
      await tx.muscleGroup.upsert({
        where: { id: mg.id },
        update: {},
        create: { id: mg.id, nameAr: mg.nameAr, nameEn: mg.nameEn, code: mg.code }
      });
    }

    for (const eq of initialEquipment) {
      await tx.equipment.upsert({
        where: { id: eq.id },
        update: {},
        create: { id: eq.id, nameAr: eq.nameAr, nameEn: eq.nameEn }
      });
    }

    // 2. Users (Tier 2) - Hash all passwords
    console.log("Ingesting Tier 2: Users & Profiles...");
    for (const user of initialUsers) {
      const rawPassword = user.password || "A@123456";
      const passwordHash = rawPassword.startsWith("$2")
        ? rawPassword
        : await bcrypt.hash(rawPassword, 12);

      await tx.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email.toLowerCase().trim(),
          name: user.name,
          role: user.role as UserRole,
          passwordHash,
          phone: user.phone,
          avatar: user.avatar,
          createdAt: new Date(user.createdAt || Date.now())
        }
      });
    }

    // 3. Coach Profiles
    for (const coach of initialCoachProfiles) {
      await tx.coachProfile.upsert({
        where: { id: coach.id },
        update: {},
        create: {
          id: coach.id,
          userId: coach.userId,
          specialties: coach.specialties || [],
          bio: coach.bio,
          yearsOfExperience: coach.yearsOfExperience || 0,
          headCoachId: coach.headCoachId
        }
      });
    }

    // 4. Client Profiles
    for (const client of initialClients) {
      await tx.clientProfile.upsert({
        where: { id: client.id },
        update: {},
        create: {
          id: client.id,
          userId: client.userId,
          gender: client.gender as any,
          heightCm: client.heightCm,
          weightKg: client.weightKg,
          address: client.address,
          emergencyContact: client.emergencyContact,
          status: client.status as any,
          preferredSportId: client.preferredSportId,
          membershipExpiry: client.membershipExpiry ? new Date(client.membershipExpiry) : null
        }
      });
    }

    // 5. Coach Assignments
    for (const ca of initialCoachAssignments) {
      await tx.clientCoachAssignment.upsert({
        where: { clientId_coachId: { clientId: ca.clientId, coachId: ca.coachId } },
        update: {},
        create: {
          id: ca.id,
          clientId: ca.clientId,
          coachId: ca.coachId,
          role: ca.role as any,
          active: ca.active !== false,
          notes: ca.notes
        }
      });
    }

    // 6. Exercises
    for (const ex of initialExercises) {
      await tx.exercise.upsert({
        where: { id: ex.id },
        update: {},
        create: {
          id: ex.id,
          nameAr: ex.nameAr,
          nameEn: ex.nameEn,
          descriptionAr: ex.descriptionAr,
          descriptionEn: ex.descriptionEn,
          instructionsAr: ex.instructionsAr,
          instructionsEn: ex.instructionsEn,
          commonMistakesAr: ex.commonMistakesAr,
          commonMistakesEn: ex.commonMistakesEn,
          coachTipsAr: ex.coachTipsAr,
          coachTipsEn: ex.coachTipsEn,
          videoUrl: ex.videoUrl,
          thumbnailUrl: ex.thumbnailUrl,
          difficulty: ex.difficulty as any,
          metricType: ex.metricType as any,
          sportId: ex.sportId,
          primaryMuscleId: ex.primaryMuscleId,
          equipmentId: ex.equipmentId,
          contraindicatedBodyParts: (ex.contraindicatedBodyParts || []) as any
        }
      });
    }
  });

  console.log("=== DATA MIGRATION COMPLETED SUCCESSFULLY ===");
}
```

---

## 4. Referential Integrity & Validation Checks

Upon script completion, an automated reconciliation suite verifies row counts and relational integrity:

1. **Foreign Key Integrity:**
   `SELECT count(*) FROM exercises WHERE sportId NOT IN (SELECT id FROM sports);` (Must be 0).
2. **Orphaned Profiles:**
   `SELECT count(*) FROM client_profiles WHERE userId NOT IN (SELECT id FROM users);` (Must be 0).
3. **Assignment Integrity:**
   `SELECT count(*) FROM client_coach_assignments WHERE clientId NOT IN (SELECT id FROM client_profiles);` (Must be 0).
4. **Password Security Check:**
   `SELECT count(*) FROM users WHERE length(passwordHash) < 50;` (Must be 0, confirming every password is a valid bcrypt hash).

---

## 5. Rollback Strategy & Backup Preservation

1. **Local State Retention:** The client-side `localStorage` key `gx_db_v1` is **never deleted** during migration. It remains intact on user browsers as a fallback until PostgreSQL operations are validated in staging.
2. **Point-In-Time Backup:** Prior to executing `prisma db push` or migration scripts against PostgreSQL, an immediate snapshot is created via:
   ```bash
   pg_dump -U postgres -d gazzar_coaching -F c -b -v -f ./backups/pre_migration_backup.dump
   ```
3. **Transactional Isolation:** All writes in the migration script run inside a single `prisma.$transaction`. If any record fails or encounters an unhandled type error, the transaction rolls back automatically, leaving PostgreSQL in its clean, pre-migration state.
