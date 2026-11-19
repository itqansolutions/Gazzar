import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";
import {
  validateImageMagicBytes,
  saveSecurePhotoFile,
  deleteSecurePhotoFile
} from "@/lib/storage";
import { auditService } from "@/server/services/audit.service";
import { PhotoAssetAngle, PhotoRecordType } from "@prisma/client";

export const dynamic = "force-dynamic";

// Maximum upload size: 10MB hard limit
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let savedStorageKey: string | null = null;

  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const access = await requireClientAccess(auth.actor, id);
    if (!access.ok) return access.response;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string" || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "A valid image file is required in 'file' form field" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "File exceeds 10MB limit" },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Magic bytes validation
    const magic = validateImageMagicBytes(buffer);
    if (!magic.valid || !magic.mimeType || !magic.ext) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file format. Only JPEG, PNG, and WEBP image files are allowed."
        },
        { status: 415 }
      );
    }

    const angleRaw = formData.get("angle")?.toString() || "FULL";
    const angle: PhotoAssetAngle = Object.values(PhotoAssetAngle).includes(angleRaw as PhotoAssetAngle)
      ? (angleRaw as PhotoAssetAngle)
      : PhotoAssetAngle.FULL;

    const recordTypeRaw = formData.get("recordType")?.toString() || "PHYSIQUE_SET";
    const recordType: PhotoRecordType = Object.values(PhotoRecordType).includes(recordTypeRaw as PhotoRecordType)
      ? (recordTypeRaw as PhotoRecordType)
      : PhotoRecordType.PHYSIQUE_SET;

    const existingPhotoId = formData.get("photoId")?.toString();

    // 1. Save file to private volume
    savedStorageKey = await saveSecurePhotoFile(access.client.id, buffer, magic.ext);

    // 2. Transaction to record photo and asset in DB
    const result = await prisma.$transaction(async (tx) => {
      let photoId = existingPhotoId;

      if (!photoId) {
        const newPhoto = await tx.clientProgressPhoto.create({
          data: {
            clientId: access.client.id,
            recordType,
            uploadedByUserId: auth.actor.user.id,
            notes: formData.get("notes")?.toString() || null,
            date: new Date()
          }
        });
        photoId = newPhoto.id;
      } else {
        const verifyPhoto = await tx.clientProgressPhoto.findUnique({
          where: { id: photoId }
        });
        if (!verifyPhoto || verifyPhoto.clientId !== access.client.id) {
          throw new Error("Target photo group not found or belongs to another client");
        }
      }

      const asset = await tx.clientProgressPhotoAsset.create({
        data: {
          photoId,
          angle,
          storageKey: savedStorageKey!,
          mimeType: magic.mimeType!,
          fileSizeBytes: buffer.length,
          uploadedByUserId: auth.actor.user.id
        }
      });

      return { photoId, assetId: asset.id, asset };
    });

    // 3. Emit AuditLog
    await auditService.log({
      actor: auth.actor,
      action: "UPLOAD_PROGRESS_PHOTO",
      entityType: "ClientProgressPhotoAsset",
      entityId: result.assetId,
      newValues: {
        photoId: result.photoId,
        clientId: access.client.id,
        angle,
        recordType,
        fileSizeBytes: buffer.length
      }
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          photoId: result.photoId,
          assetId: result.assetId,
          angle: result.asset.angle
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/clients/[id]/photos/upload] Error:", error);

    // Compensating delete if file was written to disk but DB failed
    if (savedStorageKey) {
      await deleteSecurePhotoFile(savedStorageKey);
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload photo" },
      { status: 500 }
    );
  }
}
