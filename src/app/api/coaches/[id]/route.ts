import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const coach = db.getCoachById(params.id);
    if (!coach) {
      return NextResponse.json({ success: false, message: "Coach not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: coach });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
