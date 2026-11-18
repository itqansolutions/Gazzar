import { PrismaClient } from "@prisma/client";
import { sessionService } from "../src/lib/auth/session-service";

const prisma = new PrismaClient();

async function run() {
  console.log("Starting authenticated smoke test...");

  // 1. Get users for ADMIN and CLIENT
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const clientUser = await prisma.user.findFirst({ where: { role: "CLIENT" } });

  if (!adminUser || !clientUser) {
    throw new Error("Admin or Client user not found in DB");
  }

  // Create real sessions using sessionService
  const adminSession = await sessionService.createSession({
    userId: adminUser.id,
    userAgent: "SmokeTest/1.0",
    ipAddress: "127.0.0.1"
  });

  const clientSession = await sessionService.createSession({
    userId: clientUser.id,
    userAgent: "SmokeTest/1.0",
    ipAddress: "127.0.0.1"
  });

  const adminToken = adminSession.sessionToken;
  const clientToken = clientSession.sessionToken;

  console.log("Admin session created successfully (token length:", adminToken.length, ")");
  console.log("Client session created successfully (token length:", clientToken.length, ")");

  const loggedAssignmentId = "e161cc94-3ae3-495f-bea2-9db68219dee7";
  const programId = "0c508dde-7f7c-4a00-a54f-5d32f366f21e";
  const clientProfile = await prisma.clientProfile.findFirst({ where: { userId: clientUser.id } });
  const clientProfileId = clientProfile?.id || clientUser.id;

  const baseUrl = "http://localhost:3000";

  async function apiFetch(path: string, options: { method?: string; body?: any; token?: string }) {
    const headers: Record<string, string> = {};
    if (options.token) {
      headers["Cookie"] = `gx_session=${options.token}`;
    }
    if (options.body) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      // ignore
    }
    return { status: res.status, ok: res.ok, data };
  }

  console.log("\n--- 1. Testing with ADMIN Session ---");
  const adminWorkouts = await apiFetch("/api/workouts", { token: adminToken });
  console.log("GET /api/workouts (ADMIN):", adminWorkouts.status, "Count:", adminWorkouts.data?.data?.length);

  const adminAssignment = await apiFetch(`/api/workouts/${loggedAssignmentId}`, { token: adminToken });
  console.log("GET /api/workouts/[id] (ADMIN):", adminAssignment.status, {
    title: adminAssignment.data?.data?.title,
    hasWorkoutLog: !!adminAssignment.data?.data?.workoutLog,
    loggedExercisesCount: adminAssignment.data?.data?.workoutLog?.exercises?.length,
    loggedSetsCount: adminAssignment.data?.data?.workoutLog?.exercises?.reduce(
      (acc: number, e: any) => acc + (e.sets?.length || 0), 0
    )
  });

  const adminPrograms = await apiFetch("/api/programs", { token: adminToken });
  console.log("GET /api/programs (ADMIN):", adminPrograms.status, "Count:", adminPrograms.data?.data?.length);

  const adminTemplates = await apiFetch("/api/templates", { token: adminToken });
  console.log("GET /api/templates (ADMIN):", adminTemplates.status, "Count:", adminTemplates.data?.data?.length);

  const previewApply = await apiFetch("/api/programs", {
    method: "POST",
    token: adminToken,
    body: {
      action: "PREVIEW_APPLY",
      programId,
      clientId: clientProfileId,
      startDate: new Date().toISOString()
    }
  });
  console.log("POST /api/programs PREVIEW_APPLY (ADMIN):", previewApply.status, {
    success: previewApply.data?.success,
    plannedWorkoutsCount: previewApply.data?.data?.plannedWorkouts?.length
  });

  console.log("\n--- 2. Testing with CLIENT Session ---");
  const clientWorkouts = await apiFetch("/api/workouts", { token: clientToken });
  console.log("GET /api/workouts (CLIENT):", clientWorkouts.status, "Count:", clientWorkouts.data?.data?.length);

  const clientAssignment = await apiFetch(`/api/workouts/${loggedAssignmentId}`, { token: clientToken });
  console.log("GET /api/workouts/[id] (CLIENT):", clientAssignment.status, {
    hasWorkoutLog: !!clientAssignment.data?.data?.workoutLog,
    status: clientAssignment.data?.data?.status
  });

  console.log("\n--- 3. Testing Key Pages with Auth Cookie ---");
  for (const page of [
    `/workout/${loggedAssignmentId}/execute`,
    "/templates",
    "/programs",
    "/assignments",
    `/clients/${clientProfileId}`
  ]) {
    const res = await fetch(`${baseUrl}${page}`, {
      headers: { Cookie: `gx_session=${adminToken}` }
    });
    console.log(`PAGE ${page}:`, res.status);
  }

  // Cleanup the test sessions
  await prisma.session.deleteMany({
    where: { id: { in: [adminSession.sessionId, clientSession.sessionId] } }
  });
  console.log("\nCleaned up test sessions successfully.");
  await prisma.$disconnect();
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
