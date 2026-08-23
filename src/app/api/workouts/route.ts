import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const templates = db.getTemplates();
  const assignments = db.getAssignments();
  return NextResponse.json({ success: true, data: { templates, assignments } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const assignment = db.assignWorkout(body);
    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}