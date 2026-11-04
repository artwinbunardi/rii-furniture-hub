import { getPool, type DbCtx } from "../db";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  department: string | null;
  locale: "id" | "en";
  roles: string[];
  perms: string[];
  ctx: DbCtx;
};

export async function loadUserById(userId: string): Promise<CurrentUser | null> {
  const { rows } = await getPool().query(
    `SELECT u.id, u.email::text, u.name, u.department, u.locale,
            coalesce(array_agg(DISTINCT ur.role_code) FILTER (WHERE ur.role_code IS NOT NULL), '{}') AS roles,
            coalesce(array_agg(DISTINCT rp.permission_code) FILTER (WHERE rp.permission_code IS NOT NULL), '{}') AS perms
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN role_permissions rp ON rp.role_code = ur.role_code
      WHERE u.id = $1 AND u.status = 'active'
      GROUP BY u.id`,
    [userId],
  );
  const r = rows[0];
  if (!r) return null;
  if (r.roles.includes("admin") && !r.perms.includes("*")) r.perms.push("*");
  return { ...r, ctx: { userId: r.id, perms: r.perms } };
}

