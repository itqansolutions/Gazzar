import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const client = db.getClient360(params.id);
    if (!client) {
      return NextResponse.json({ success: false, message: "Client not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: client });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updated = db.updateClient(params.id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = db.getUserById(params.id);
    if (user) {
      db.deleteUser(user.id);
    }
    return NextResponse.json({ success: true, message: "Client deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
