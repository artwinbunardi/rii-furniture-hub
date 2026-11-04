import { Client } from "pg";
import { seed } from "../scripts/seed";
import { loadUserById } from "../src/lib/auth/user";
import { addDays, todayJakarta } from "../src/lib/utils";

export async function resetData() {
  // re-seed base data (users, products, stock) without demo reservations
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  await seed({ adminUrl: process.env.TEST_DATABASE_ADMIN_URL!, withReservations: false, log: false, uploadDir: "./storage/test-uploads" });
}

export async function admin<T>(fn: (c: Client) => Promise<T>) {
  const c = new Client({ connectionString: process.env.TEST_DATABASE_ADMIN_URL });
  await c.connect();
  try { return await fn(c); } finally { await c.end(); }
}

export async function actor(email: string) {
  const id = await admin(async (c) => (await c.query(`SELECT id FROM users WHERE email = $1`, [email])).rows[0].id);
  return (await loadUserById(id))!;
}

export async function productId(sku: string) {
  return admin(async (c) => (await c.query(`SELECT id FROM products WHERE sku = $1`, [sku])).rows[0].id as string);
}

export async function projectId(code = "PRJ-2026-001") {
  return admin(async (c) => (await c.query(`SELECT id FROM projects WHERE code = $1`, [code])).rows[0].id as string);
}

export async function balance(sku: string) {
  return admin(async (c) => (await c.query(`SELECT b.* FROM inventory_balances b JOIN products p ON p.id = b.product_id WHERE p.sku = $1`, [sku])).rows[0]);
}

export const day = (n: number) => addDays(todayJakarta(), n);
