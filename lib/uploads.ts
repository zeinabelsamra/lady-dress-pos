import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Photos live outside /public because Next.js only serves public files that
// existed at build time. They are served by app/uploads/[name]/route.ts.
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const IMAGE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Saves an uploaded image and returns its public URL. */
export async function saveImage(file: File): Promise<string> {
  const ext =
    Object.keys(IMAGE_TYPES).find((e) => IMAGE_TYPES[e] === file.type) ?? null;
  if (!ext) throw new Error("Photo must be a JPG, PNG, WEBP, GIF or AVIF image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Photo must be smaller than 8 MB.");

  const name = `${randomUUID()}${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

/** Removes an uploaded photo (ignores web links and already-missing files). */
export async function deleteImage(url: string) {
  const name = url.startsWith("/uploads/") ? url.slice("/uploads/".length) : null;
  if (!name || !/^[a-zA-Z0-9-]+\.[a-z]+$/.test(name)) return;
  await unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
}

/**
 * Checks a typed/pasted image address. Only web links (http/https) and our own
 * uploaded photos work — a path on the computer (C:\...) can't be shown by
 * the browser, so it gets a clear error instead of a broken image.
 */
export function normalizeImageUrl(raw: string): { url: string | null } | { error: string } {
  const value = raw.trim().replace(/^["']+|["']+$/g, "").trim();
  if (!value) return { url: null };
  if (value.startsWith("/uploads/")) return { url: value };
  if (/^https?:\/\//i.test(value)) {
    try {
      return { url: new URL(value).toString() };
    } catch {
      return { error: "That image link isn't valid." };
    }
  }
  return {
    error:
      "That's a file on your computer, not a web link. Use \"Upload photo\" to add it instead.",
  };
}
