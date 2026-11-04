# Website Builder

Open **Website Builder** in the app sidebar (admins by default; grant `website.edit` / `website.publish`
/ `media.manage` to other roles in Admin → Users → Roles).

## Concepts

- **Draft** — what you edit. Stored in normalised tables (`website_pages`, `website_sections`, theme,
  settings) with a revision number. Saving a draft never changes what users see.
- **Published version** — an immutable JSON snapshot in `website_versions`; the live site renders the
  version that `websites.published_version_id` points to. Every publish creates the next version number.
- **Restore** — load any version back into the draft (needs `website.edit`), or restore *and* publish it
  as a new version (needs `website.publish`). Nothing is ever deleted.
- **Concurrent edits** — saving with an outdated revision is refused (“changed elsewhere, reload”)
  instead of silently overwriting someone else's work.
- **Live data** — product, category, collection, availability and statistics sections read the
  inventory database at render time. Templates never contain product data.

## Screens

| Screen | Purpose |
|---|---|
| Overview | live version, draft status, quick actions, recent versions, builder activity |
| Websites | the primary website, its template, access and domain |
| Templates | 50 templates · search · category filter · desktop/mobile/fullscreen preview · **Use This Template** (keeps custom pages and branding if ticked) |
| Visual editor | full-screen editor (below) |
| Pages | create (landing / FAQ / blank), rename, change URL, SEO, duplicate, delete, set as homepage. System pages (catalog, product, cart…) have fixed URLs because the reservation flow depends on them |
| Sections | library of section types, variants and where they are used |
| Navigation | menu links (ordered), header button, announcement bar, footer texts |
| Theme & Branding | logo, favicon, 12 colours, fonts, heading style, buttons, card style, image ratio, radius, container width, density, header/footer style |
| Product Collections | links to the collections admin (same data the sections use) |
| Media Library | upload (multi-file), categories, folders, alt text, search, replace file (same URL), delete (blocked while used) |
| SEO Settings | site name, default title & description, per-page preview |
| Domain & Access | require login to browse; record custom domain/subdomain (**no DNS is configured by the app**) |
| Publish | list of pending changes vs. live, version note, publish |
| Version History | preview any version, restore to draft, restore & publish |

## Visual editor

- **Top bar**: page switcher, desktop / tablet / mobile canvas widths, undo / redo (Ctrl+Z / Ctrl+Shift+Z),
  save status, Preview (opens the draft preview), Save draft (Ctrl+S), Publish (if permitted; saves first).
- **Left panel**: *Pages* (switch, quick-add page), *Add Section* (grouped, each with style variants;
  inserts after the selected section or at the “+” you clicked), *Layout* (drag-and-drop list with
  duplicate / hide / delete), *Theme* (live), *Assets* (media grid, upload, click to place in the selected section).
- **Canvas** (iframe, real viewport widths so mobile layouts are genuine): click to select, click any
  text to type in place, section toolbar (drag handle, move up/down, duplicate, hide/show, delete),
  drag sections to reorder, “+ Add section” below the selection, click header/footer to edit them.
- **Right panel**: section *Content* (variant + all fields: text, rich text areas, images via media
  picker, button labels & destinations with page picker, product source/collection/category/SKUs,
  repeatable items) and *Style* (background & text colour, alignment, heading size & weight, padding,
  margins, radius, hide on desktop / mobile). With nothing selected: page title & SEO.

## Section types

Announcement bar, Hero banner (8 variants), Image slider, Featured products, Product category grid,
Collection showcase, Product carousel, Promotional banner, Text & image, Gallery, Statistics (live
counts), Testimonials, FAQ, Contact (form → admin outbox), Reservation CTA, Search & availability,
Video, Custom content — plus editable Header and Footer. Functional sections (catalog, product detail,
collections, cart, my reservations, reservation detail, account, login form) live on their system pages:
they can be styled, re-varianted and hidden but not deleted or placed elsewhere.

## Template thumbnails

`public/template-thumbs/*.jpg` are screenshots of the templates' own previews (generated with
`npm run thumbs` while the app runs). Regenerate after changing templates.
