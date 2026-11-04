// Generates template-library thumbnails by screenshotting each template's live preview.
// Usage: start the app (npm run dev), then: BASE_URL=http://localhost:3000 node scripts/template-thumbs.cjs
// Requires a user with website.edit (defaults to the demo admin).
const { chromium } = require("playwright");
const path = require("path");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.THUMB_EMAIL || "admin@rii.demo";
const PASS = process.env.THUMB_PASSWORD || "Demo1234!";
(async () => {
  const ids = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 0.5 });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login`);
  await p.fill("#email", EMAIL); await p.fill("#password", PASS);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/login")), p.click("button[type=submit]:has-text(\"Masuk\"), button[type=submit]:has-text(\"Sign in\")")]);
  const list = ids.length ? ids : await p.evaluate(async (base) => (await (await fetch(`${base}/api/app/templates`)).json()).map((t) => t.id), BASE);
  for (const id of list) {
    await p.goto(`${BASE}/preview/template/${id}?embed=1`, { waitUntil: "networkidle", timeout: 90000 });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(__dirname, "..", "public", "template-thumbs", `${id}.jpg`), type: "jpeg", quality: 72 });
    console.log("thumb", id);
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
