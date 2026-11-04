import fs from "node:fs/promises";
import path from "node:path";

const MIME: Record<string, string> = { ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".mp4": "video/mp4" };

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const root = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");
  const file = path.resolve(root, ...key);
  if (!file.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });
  try {
    const buf = await fs.readFile(file);
    const ext = path.extname(file).toLowerCase();
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
        ...(ext === ".svg" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
