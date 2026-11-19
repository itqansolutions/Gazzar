import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import prisma from "@/lib/prisma";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";
import { resolveSecureStoragePath } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  {
    params
  }: {
    params: Promise<{ id: string; photoId: string; assetId: string }> | { id: string; photoId: string; assetId: string };
  }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id, photoId, assetId } = await Promise.resolve(params);
    const access = await requireClientAccess(auth.actor, id);
    if (!access.ok) {
      // Identical 404 response to avoid leaking existence of assets
      return NextResponse.json({ success: false, message: "Asset not found" }, { status: 404 });
    }

    const asset = await prisma.clientProgressPhotoAsset.findUnique({
      where: { id: assetId },
      include: { photo: true }
    });

    if (!asset || asset.photoId !== photoId || asset.photo.clientId !== access.client.id) {
      return NextResponse.json({ success: false, message: "Asset not found" }, { status: 404 });
    }

    const fullPath = resolveSecureStoragePath(asset.storageKey);

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ success: false, message: "Asset file not found on disk" }, { status: 404 });
    }

    const fileStream = fs.createReadStream(fullPath);
    // Convert Node ReadStream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      }
    });

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": asset.fileSizeBytes.toString(),
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error: any) {
    console.error("[GET .../assets/[assetId]/file] Error:", error);
    return NextResponse.json({ success: false, message: "Asset not found" }, { status: 404 });
  }
}
