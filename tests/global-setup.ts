import { loadEnv } from "../scripts/env";
import { migrate } from "../scripts/migrate";

export default async function setup() {
  loadEnv();
  const admin = process.env.TEST_DATABASE_ADMIN_URL;
  if (!admin) throw new Error("TEST_DATABASE_ADMIN_URL not set");
  await migrate(admin, { reset: true, log: false });
}
