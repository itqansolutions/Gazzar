import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const users = db.getUsers();
  return NextResponse.json({ success: true, user: users[0] });
}
