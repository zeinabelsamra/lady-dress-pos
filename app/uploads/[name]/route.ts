import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR, IMAGE_TYPES } from "../../../lib/uploads";
import { getCurrentUser } from "../../../lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const { name } = await params;

  // Only plain generated file names — no path traversal
  if (!/^[a-zA-Z0-9-]+\.[a-z]+$/.test(name)) {
    return new Response("Not found", { status: 404 });
  }
  const type = IMAGE_TYPES[path.extname(name).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });

  try {
    const data = await readFile(path.join(UPLOAD_DIR, name));
    return new Response(data, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
