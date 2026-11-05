import { NextRequest, NextResponse } from "next/server";
import { membershipService } from "@/server/services/membership.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const packages = membershipService.getPackages();
    const memberships = await membershipService.getMemberships();
    return NextResponse.json({ success: true, data: { packages, memberships } });
  } catch (error: any) {
    console.error("[GET /api/memberships] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const membership = await membershipService.createMembership(body);
    return NextResponse.json({ success: true, data: membership }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/memberships] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
