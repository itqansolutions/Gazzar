import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = db.getUsers().find(u => u.email.toLowerCase() === body.email?.toLowerCase());
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 401 });
    }
    return NextResponse.json({ success: true, user, token: "mock_jwt_token" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}