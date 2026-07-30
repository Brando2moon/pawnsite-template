# Northline Pawn & Exchange — Website Template

A professional static storefront and backend starter for a pawn shop. The design uses deep navy, graphite, steel gray, cool white, and restrained blue-gray accents. It is intentionally framework-free and GitHub Pages friendly.

## Included pages

- `index.html` — premium homepage and featured inventory
- `shop.html` — search, category filters, sorting, favorites, product detail modal, and cart
- `sell-pawn.html` — online appraisal lead form with image-upload UI
- `firearms.html` — separate request-only regulated-item workflow
- `checkout.html` — backend payment-session handoff for regular merchandise
- `about.html` — trust, story, values, owner/team content structure
- `contact.html` — location, hours, and contact form
- `dashboard.html` — protected staff dashboard prototype
- `404.html` — custom not-found page

## Shared files

- `styles.css` — complete responsive design system
- `config.js` — client name, store information, public configuration, and API routes
- `app.js` — catalog, filters, modal, favorites, cart, checkout summary, and demo forms
- `supabase-schema.sql` — starter PostgreSQL/Supabase schema

## Run locally

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Customize the client information

Edit `config.js` first:

```js
window.PAWN_CONFIG = {
  brandName: "Client Pawn Shop Name",
  brandShort: "Client Pawn",
  phone: "...",
  email: "...",
  address: "..."
};
```

Then replace permanent placeholder copy and page titles.

## Backend implementation order

1. **Authentication and staff roles**
   - owner
   - manager
   - inventory staff
   - appraiser
   - licensed firearm staff
   - customer support
   - view-only

2. **Inventory API**
   - Replace `window.PAWN_CATALOG` in `app.js` with `GET /api/products`.
   - Return only public-safe fields to anonymous users.
   - Use lifecycle states: `draft`, `available`, `reserved`, `sold`, `returned`, and `archived`.
   - Treat most pawn inventory as quantity `1` and reserve it atomically.

3. **Images and private uploads**
   - Keep public product images separate from private appraisal photos.
   - Validate MIME type, extension, size, dimensions, count, and malware scan status.
   - Use signed upload/download URLs for private customer submissions.

4. **Pawn requests**
   - Connect `sell-pawn.html` to `/api/pawn-requests`.
   - Add rate limiting and bot protection.
   - Do not promise a final value before in-person inspection.

5. **Regular merchandise checkout**
   - Recalculate prices from the database on the server.
   - Atomically reserve one-of-one inventory.
   - Create the payment session server-side with an approved processor.
   - Use webhooks to confirm payment and order status.
   - Never expose payment secret keys in `config.js` or browser JavaScript.

6. **Regulated-item requests**
   - Products with `purchaseMode: "reserve"` never enter the ordinary cart.
   - Connect the inquiry form to `/api/firearm-requests`.
   - Require licensed staff review before sending transaction, payment, transfer, or pickup instructions.
   - Keep detailed records in the client’s approved system of record.
   - Never expose complete serial-number data publicly.

7. **Dashboard**
   - Protect the page and all admin APIs server-side.
   - Add audit logs for inventory, pricing, customer records, request assignment, order status, refunds, and regulated workflows.

## Suggested API routes

```text
GET    /api/products
GET    /api/products/:id
POST   /api/pawn-requests
POST   /api/firearm-requests
POST   /api/contact
POST   /api/checkout/session
POST   /api/webhooks/payment-provider
GET    /api/admin/overview
POST   /api/admin/products
PATCH  /api/admin/products/:id
PATCH  /api/admin/requests/:id
```

## Important boundary

This template separates ordinary ecommerce from firearm requests. Before launch, the client must have the site’s policies, pawn-loan disclosures, regulated-item procedures, shipping restrictions, identity/age requirements, privacy language, payment-provider approval, and state/local requirements reviewed and approved by qualified professionals.

The included copy and SQL are development scaffolding, not legal advice.
