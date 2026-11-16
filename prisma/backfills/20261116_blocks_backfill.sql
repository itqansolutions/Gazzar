-- ==============================================================================
-- Idempotent Backfill: Legacy Workouts & Assignments -> V2 Blocks & Items
-- Executed on: 2026-11-16
-- ==============================================================================

-- 1. Backfill ProgramAssignment snapshots & sourceMasterVersion
UPDATE "program_assignments" pa
SET 
  "sourceMasterVersion" = COALESCE(pa."sourceMasterVersion", tp."masterVersion", 1),
  "programTitleSnapshot" = COALESCE(pa."programTitleSnapshot", tp."titleEn", tp."titleAr", 'Program')
FROM "training_programs" tp
WHERE pa."programId" = tp."id"
  AND (pa."sourceMasterVersion" IS NULL OR pa."programTitleSnapshot" IS NULL);

-- 2. Backfill programWorkoutOrder for Program-linked ClientWorkoutAssignments
WITH ordered_assignments AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "programAssignmentId", "programWeekNumber", "programDayNumber" 
      ORDER BY "createdAt" ASC, id ASC
    ) - 1 AS calc_order
  FROM "client_workout_assignments"
  WHERE "programAssignmentId" IS NOT NULL
)
UPDATE "client_workout_assignments" cwa
SET "programWorkoutOrder" = oa.calc_order
FROM ordered_assignments oa
WHERE cwa.id = oa.id
  AND cwa."programWorkoutOrder" IS NULL;

-- 3. Backfill WorkoutTemplate -> WorkoutBlock + BlockItem
INSERT INTO "workout_blocks" (
  "id", "templateId", "programWorkoutId", "orderIndex", "type", "title", "rounds", 
  "durationSeconds", "restBetweenRoundsSeconds", "notes", "createdAt", "updatedAt"
)
SELECT 
  gen_random_uuid()::text,
  t.id,
  NULL,
  0,
  'SINGLE'::"BlockType",
  'Main Block',
  1,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
FROM "workout_templates" t
WHERE EXISTS (
  SELECT 1 FROM "workout_template_exercises" wte WHERE wte."templateId" = t.id
)
AND NOT EXISTS (
  SELECT 1 FROM "workout_blocks" wb WHERE wb."templateId" = t.id
);

INSERT INTO "block_items" (
  "id", "blockId", "orderIndex", "itemType", "exerciseId", "targetSets", "targetReps",
  "targetWeightKg", "targetDistanceKm", "targetTimeSeconds", "targetPace", "targetRounds",
  "restSeconds", "tempo", "instructions", "createdAt", "updatedAt"
)
SELECT 
  gen_random_uuid()::text,
  wb.id,
  wte."orderIndex",
  'EXERCISE'::"BlockItemType",
  wte."exerciseId",
  wte."targetSets",
  wte."targetReps",
  wte."targetWeightKg",
  wte."targetDistanceKm",
  wte."targetTimeSeconds",
  wte."targetPace",
  wte."targetRounds",
  wte."restSeconds",
  NULL,
  wte."instructions",
  NOW(),
  NOW()
FROM "workout_template_exercises" wte
JOIN "workout_blocks" wb ON wb."templateId" = wte."templateId"
WHERE NOT EXISTS (
  SELECT 1 FROM "block_items" bi 
  WHERE bi."blockId" = wb.id AND bi."exerciseId" = wte."exerciseId" AND bi."orderIndex" = wte."orderIndex"
);

-- 4. Backfill ProgramWorkout -> WorkoutBlock + BlockItem
INSERT INTO "workout_blocks" (
  "id", "templateId", "programWorkoutId", "orderIndex", "type", "title", "rounds", 
  "durationSeconds", "restBetweenRoundsSeconds", "notes", "createdAt", "updatedAt"
)
SELECT 
  gen_random_uuid()::text,
  NULL,
  pw.id,
  0,
  'SINGLE'::"BlockType",
  COALESCE(pw.title, 'Main Block'),
  1,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
FROM "program_workouts" pw
WHERE pw."templateId" IS NOT NULL
AND EXISTS (
  SELECT 1 FROM "workout_template_exercises" wte WHERE wte."templateId" = pw."templateId"
)
AND NOT EXISTS (
  SELECT 1 FROM "workout_blocks" wb WHERE wb."programWorkoutId" = pw.id
);

INSERT INTO "block_items" (
  "id", "blockId", "orderIndex", "itemType", "exerciseId", "targetSets", "targetReps",
  "targetWeightKg", "targetDistanceKm", "targetTimeSeconds", "targetPace", "targetRounds",
  "restSeconds", "tempo", "instructions", "createdAt", "updatedAt"
)
SELECT 
  gen_random_uuid()::text,
  wb.id,
  wte."orderIndex",
  'EXERCISE'::"BlockItemType",
  wte."exerciseId",
  wte."targetSets",
  wte."targetReps",
  wte."targetWeightKg",
  wte."targetDistanceKm",
  wte."targetTimeSeconds",
  wte."targetPace",
  wte."targetRounds",
  wte."restSeconds",
  NULL,
  wte."instructions",
  NOW(),
  NOW()
FROM "program_workouts" pw
JOIN "workout_blocks" wb ON wb."programWorkoutId" = pw.id
JOIN "workout_template_exercises" wte ON wte."templateId" = pw."templateId"
WHERE NOT EXISTS (
  SELECT 1 FROM "block_items" bi 
  WHERE bi."blockId" = wb.id AND bi."exerciseId" = wte."exerciseId" AND bi."orderIndex" = wte."orderIndex"
);

-- 5. Backfill ClientWorkoutAssignment -> AssignmentBlock + AssignmentBlockItem
INSERT INTO "assignment_blocks" (
  "id", "assignmentId", "orderIndex", "type", "title", "rounds", 
  "durationSeconds", "restBetweenRoundsSeconds", "notes", "createdAt", "updatedAt"
)
SELECT 
  gen_random_uuid()::text,
  cwa.id,
  0,
  'SINGLE'::"BlockType",
  COALESCE(cwa.title, 'Main Block'),
  1,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
FROM "client_workout_assignments" cwa
WHERE EXISTS (
  SELECT 1 FROM "client_workout_assignment_exercises" cwae WHERE cwae."assignmentId" = cwa.id
)
AND NOT EXISTS (
  SELECT 1 FROM "assignment_blocks" ab WHERE ab."assignmentId" = cwa.id
);

INSERT INTO "assignment_block_items" (
  "id", "assignmentBlockId", "orderIndex", "itemType", "exerciseId", 
  "exerciseNameSnapshot", "metricTypeSnapshot", "targetSets", "targetReps",
  "targetWeightKg", "targetDistanceKm", "targetTimeSeconds", "targetPace", 
  "targetRounds", "restSeconds", "tempo", "instructions", "createdAt", "updatedAt"
)
SELECT 
  gen_random_uuid()::text,
  ab.id,
  cwae."orderIndex",
  'EXERCISE'::"BlockItemType",
  cwae."exerciseId",
  COALESCE(e."nameEn", e."nameAr", 'Exercise'),
  COALESCE(e."metricType", 'SETS_REPS_WEIGHT'::"MetricType"),
  cwae."targetSets",
  cwae."targetReps",
  cwae."targetWeightKg",
  cwae."targetDistanceKm",
  cwae."targetTimeSeconds",
  cwae."targetPace",
  cwae."targetRounds",
  cwae."restSeconds",
  NULL,
  cwae."instructions",
  NOW(),
  NOW()
FROM "client_workout_assignment_exercises" cwae
JOIN "assignment_blocks" ab ON ab."assignmentId" = cwae."assignmentId"
LEFT JOIN "exercises" e ON e.id = cwae."exerciseId"
WHERE NOT EXISTS (
  SELECT 1 FROM "assignment_block_items" abi 
  WHERE abi."assignmentBlockId" = ab.id 
    AND abi."exerciseId" = cwae."exerciseId" 
    AND abi."orderIndex" = cwae."orderIndex"
);
