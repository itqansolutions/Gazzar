import { NextRequest, NextResponse } from "next/server";
import { nutritionService } from "@/server/services/nutrition.service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await nutritionService.updateMealPlan(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/nutrition/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await nutritionService.deleteMealPlan(id);
    return NextResponse.json({ success: true, message: "Meal plan deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE /api/nutrition/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
