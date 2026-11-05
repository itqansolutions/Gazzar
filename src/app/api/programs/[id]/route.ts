import { NextRequest, NextResponse } from "next/server";
import { programService } from "@/server/services/program.service";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await programService.deleteProgram(id);
    return NextResponse.json({ success: true, message: "Program deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE /api/programs/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
