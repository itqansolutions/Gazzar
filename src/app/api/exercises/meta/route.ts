import { NextResponse } from "next/server";
import { exerciseService } from "@/server/services/exercise.service";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [muscleGroups, equipment, sports] = await Promise.all([
      exerciseService.getMuscleGroups(),
      exerciseService.getEquipment(),
      prisma.sport.findMany({ orderBy: { nameEn: "asc" } })
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
