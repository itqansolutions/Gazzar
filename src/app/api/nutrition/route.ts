import { NextRequest, NextResponse } from "next/server";
import { nutritionService } from "@/server/services/nutrition.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;
    const plans = await nutritionService.getMealPlans(clientId);
    return NextResponse.json({ success: true, data: plans });
  } catch (error: any) {
    console.error("[GET /api/nutrition] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const plan = await nutritionService.createMealPlan(body);
    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/nutrition] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
