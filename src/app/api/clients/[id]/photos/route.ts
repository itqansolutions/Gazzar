import { NextRequest, NextResponse } from "next/server";
import { healthService } from "@/server/services/health.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const photos = await healthService.getProgressPhotos(clientId);
    return NextResponse.json({ success: true, data: photos });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await req.json();
    const photo = await healthService.addProgressPhoto(clientId, body);
    return NextResponse.json({ success: true, data: photo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
