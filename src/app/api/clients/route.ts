import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const clients = db.getClients(status as any);
  return NextResponse.json({ success: true, data: clients });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newClient = db.createClient(body);
    return NextResponse.json({ success: true, data: newClient }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}