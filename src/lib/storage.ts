import fs from "fs";
import path from "path";
import crypto from "crypto";

export function getPhotoStorageDirectory(): string {
  const dir = process.env.PHOTO_STORAGE_PATH || path.join(process.cwd(), "data", "progress-photos");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Validates image buffer using magic bytes.
 * Supports JPEG, PNG, WEBP.
 */
export function validateImageMagicBytes(buffer: Buffer): { valid: boolean; mimeType?: string; ext?: string } {
  if (!buffer || buffer.length < 12) {
    return { valid: false };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mimeType: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, mimeType: "image/png", ext: "png" };
  }

  // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, mimeType: "image/webp", ext: "webp" };
  }

  return { valid: false };
}

/**
 * Resolves a storage key into an absolute file path safely, guarding against path traversal attacks.
 */
export function resolveSecureStoragePath(storageKey: string): string {
  const baseDir = path.resolve(getPhotoStorageDirectory());
  const targetPath = path.resolve(baseDir, storageKey);

  if (!targetPath.startsWith(baseDir)) {
    throw new Error("Security Error: Path traversal attempt detected");
  }

  return targetPath;
}

/**
 * Saves a photo file buffer to the private storage volume under {clientId}/{uuid}.{ext}
 */
export async function saveSecurePhotoFile(clientId: string, buffer: Buffer, ext: string): Promise<string> {
  const baseDir = getPhotoStorageDirectory();
  const clientDir = path.join(baseDir, clientId);

  if (!fs.existsSync(clientDir)) {
    fs.mkdirSync(clientDir, { recursive: true });
  }

  const filename = `${crypto.randomUUID()}.${ext}`;
  const relativeKey = `${clientId}/${filename}`;
  const fullPath = resolveSecureStoragePath(relativeKey);

  await fs.promises.writeFile(fullPath, buffer);
  return relativeKey;
}

/**
 * Deletes a file from storage safely.
 */
export async function deleteSecurePhotoFile(storageKey: string): Promise<boolean> {
  try {
    const fullPath = resolveSecureStoragePath(storageKey);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
  } catch (err) {
    console.error("[deleteSecurePhotoFile] Failed to delete file:", err);
  }
  return false;
}
