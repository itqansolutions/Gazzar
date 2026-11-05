import { NextRequest, NextResponse } from "next/server";
import { healthService } from "@/server/services/health.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await req.json();

    const note = await healthService.addClientNote(
      clientId,
      body.authorId,
      body.noteType,
      body.content
    );
    return NextResponse.json({ success: true, data: note });
  } catch (error: any) {
    console.error("[POST /api/clients/[id]/notes] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add client note" },
      { status: 500 }
    );
  }
}
