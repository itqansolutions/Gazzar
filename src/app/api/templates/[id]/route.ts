import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { workoutService, WorkoutServiceError } from "@/server/services/workout.service";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const template = await workoutService.getTemplateById(id);
    if (!template) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: template });
  } catch (err: any) {
    console.error("[API_TEMPLATE_ID_GET_ERROR]:", err);
    const status = err instanceof WorkoutServiceError ? err.statusCode : 500;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const body = await request.json();
    const updated = await workoutService.updateTemplate(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[API_TEMPLATE_ID_PATCH_ERROR]:", err);
    const status = err instanceof WorkoutServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    await workoutService.deleteTemplate(id);
    return NextResponse.json({ success: true, message: "Template deleted successfully" });
  } catch (err: any) {
    console.error("[API_TEMPLATE_ID_DELETE_ERROR]:", err);
    const status = err instanceof WorkoutServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}
