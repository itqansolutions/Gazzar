import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/route-guard";
import { isPresetAvatar } from "@/lib/avatars";

export const dynamic = "force-dynamic";

// Any signed-in user can switch their OWN picture to one of the preset avatars.
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const avatar = typeof body.avatar === "string" ? body.avatar : "";
  if (!isPresetAvatar(avatar)) {
    return NextResponse.json({ success: false, message: "Unknown avatar" }, { status: 400 });
  }
  await prisma.user.update({ where: { id: auth.actor.user.id }, data: { avatar } });
  return NextResponse.json({ success: true, avatar });
}
