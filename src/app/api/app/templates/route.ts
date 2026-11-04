import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPerm } from "@/lib/rbac";
import { q } from "@/lib/db";

/** Template ids/names (used by the thumbnail generator script). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPerm(user.perms, "website.edit")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await q(user.ctx, `SELECT id, name, category FROM website_templates ORDER BY sort`);
  return NextResponse.json(rows);
}
