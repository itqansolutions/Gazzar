import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const exercises = db.getExercises();
  return NextResponse.json({ success: true, data: exercises });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newEx = db.createExercise(body);
    return NextResponse.json({ success: true, data: newEx }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}