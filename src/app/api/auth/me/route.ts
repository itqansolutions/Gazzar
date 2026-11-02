import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Missing or invalid authorization token" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const session = verifyAuthToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired session token" },
        { status: 401 }
      );
    }

    const liveUser = db.getUserById(session.id) || db.getUserByEmail(session.email);
    if (!liveUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const sanitizedUser = {
      id: liveUser.id,
      email: liveUser.email,
      name: liveUser.name,
      role: liveUser.role,
      avatar: liveUser.avatar,
      phone: liveUser.phone,
      createdAt: liveUser.createdAt
    };

    return NextResponse.json({ success: true, user: sanitizedUser });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
