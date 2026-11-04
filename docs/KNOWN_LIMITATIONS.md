# Known limitations

Honest list of what this build does **not** do, or what has not been verified.

## Not done
- **Not deployed.** No hosting, domain or production database has been set up. See DEPLOYMENT.md.
- **No source repository yet.** The code lives in this workspace and in the project files copy.
- **Email is not sent.** Invitations, password resets and reservation notifications are stored in the
  in-app outbox (Admin → Settings → Outbox), where an admin can copy links. No SMTP adapter is implemented.
- **Media storage is local disk** (`UPLOAD_DIR`). Multi-instance or serverless hosting needs an object-storage adapter.
- **Media URLs are public.** `/media/...` files (product photos, banners) can be fetched without logging in if someone has the URL. Pages and data still require login.
- **One primary website.** The schema supports several websites, but the UI manages only the primary one.
- **Custom domain is recorded only.** The Domain screen stores the intended domain; DNS and TLS must be configured outside the app.
- **No bulk product import** (CSV/Excel). Products are created one by one in Inventory → New product.
- **No prices or payments.** Internal system; no payment gateway (as specified).
- **Editor text is plain text.** Inline editing has no bold/italic/links inside a paragraph, and there is no custom HTML/code block (deliberately, for safety).
- **No real-time co-editing.** Two people editing the draft at once: the second save is refused with a reload prompt.
- **Templates share one component library.** The 50 templates differ in theme, fonts, colours, header/footer styles, section composition and section variants (checked automatically: all 50 are distinct), not in bespoke code per template.
- **No ESLint configuration** is committed (TypeScript strict checking is).

## Environment-dependent
- **Camera QR/barcode scanning** uses the browser's BarcodeDetector API (Chrome/Edge on Android, ChromeOS, macOS). On other browsers the scanner shows a notice and manual code entry (or a handheld USB/Bluetooth scanner acting as a keyboard) is used.
- **Login and contact-form throttling are in memory**, per server process. They reset on restart and are not shared between instances; use a proxy/WAF rate limit for multi-instance deployments.
- **Fonts load from Google Fonts.** Without internet access the site falls back to system fonts.

## Not verified
- Browsers other than Chromium (Safari, Firefox) were not tested.
- No accessibility audit with screen readers; basic semantics, labels and focus states are in place.
- No load or performance testing beyond the 6-way concurrent approval test.
- Supabase/managed Postgres with connection pooling was not tested (plain PostgreSQL 16 was).
- The private Booqable reference was **not accessed** (it requires authentication); the UX was designed from general knowledge of rental-software patterns, and no Booqable code, text, branding or images were used.

## Demo data
All seeded users, products, stock quantities, projects, reservations, testimonials and images are
**demonstration data** and are labelled as such. Replace them before real use (`npm run db:bootstrap`
creates an empty installation).
