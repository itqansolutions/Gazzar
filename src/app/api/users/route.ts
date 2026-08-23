import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const users = db.getUsers();
    return NextResponse.json({ success: true, data: users });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.email || !body.name || !body.role) {
      return NextResponse.json({ success: false, message: "Name, email and role are required" }, { status: 400 });
    }

    const newUser = db.createUser(body);
    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}