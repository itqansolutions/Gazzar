import { NextResponse } from "next/server";
import { workoutService } from "@/server/services/workout.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sportId = searchParams.get("sportId") || undefined;
    const templates = await workoutService.getTemplates(sportId);
    return NextResponse.json({ success: true, data: templates });
  } catch (err: any) {
    console.error("[API_TEMPLATES_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newTemplate = await workoutService.createTemplate(body);
    return NextResponse.json({ success: true, data: newTemplate }, { status: 201 });
  } catch (err: any) {
    console.error("[API_TEMPLATES_POST_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
