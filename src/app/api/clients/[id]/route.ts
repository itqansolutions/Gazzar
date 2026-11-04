import { NextResponse } from "next/server";
import { clientService } from "@/server/services/client.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientService.getClientById(params.id);
    if (!client) {
      return NextResponse.json({ success: false, message: "Client not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: client });
  } catch (err: any) {
    console.error("[API_CLIENT_ID_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updated = await clientService.updateClient(params.id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[API_CLIENT_ID_PATCH_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await clientService.deleteClient(params.id);
    return NextResponse.json({ success: true, message: "Client deleted successfully" });
  } catch (err: any) {
    console.error("[API_CLIENT_ID_DELETE_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
