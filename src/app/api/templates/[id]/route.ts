import { NextResponse } from "next/server";
import { workoutService } from "@/server/services/workout.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const template = await workoutService.getTemplateById(params.id);
    if (!template) {
      return NextResponse.json({ success: false, message: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: template });
  } catch (err: any) {
    console.error("[API_TEMPLATE_ID_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updated = await workoutService.updateTemplate(params.id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[API_TEMPLATE_ID_PATCH_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await workoutService.deleteTemplate(params.id);
    return NextResponse.json({ success: true, message: "Template deleted successfully" });
  } catch (err: any) {
    console.error("[API_TEMPLATE_ID_DELETE_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
