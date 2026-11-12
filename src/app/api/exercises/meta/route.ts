import { NextResponse } from "next/server";
import { exerciseService } from "@/server/services/exercise.service";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const [muscleGroups, equipment, sports] = await Promise.all([
      exerciseService.getMuscleGroups(),
      exerciseService.getEquipment(),
      prisma.sport.findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: { nameEn: "asc" }
      })
    ]);

    return NextResponse.json({
      success: true,
      data: { muscleGroups, equipment, sports }
    });
  } catch (err: any) {
    console.error("[API_EXERCISES_META_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
