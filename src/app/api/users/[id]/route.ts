import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = db.getUserById(params.id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
    const { password, ...sanitized } = user;
    return NextResponse.json({ success: true, data: sanitized });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updated = db.updateUser(params.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
    const { password, ...sanitized } = updated;
    return NextResponse.json({ success: true, data: sanitized });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const success = db.deleteUser(params.id);
    if (!success) {
      return NextResponse.json({ success: false, message: "User not found or cannot be deleted" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}