import { NextResponse } from "next/server";
import { clientService } from "@/server/services/client.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || "ALL") as any;
    const search = searchParams.get("search") || undefined;

    const clients = await clientService.getClients({ status, search });
    return NextResponse.json({ success: true, data: clients });
  } catch (err: any) {
    console.error("[API_CLIENTS_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newClient = await clientService.createClient(body);
    return NextResponse.json({ success: true, data: newClient }, { status: 201 });
  } catch (err: any) {
    console.error("[API_CLIENTS_POST_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}