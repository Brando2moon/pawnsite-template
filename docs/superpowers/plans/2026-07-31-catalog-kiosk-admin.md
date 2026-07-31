# Catalog, Kiosk, and Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a buyer-only public catalog with real prices and photos, a secure inventory admin, and an in-store special-order firearm kiosk that submits staff-reviewed quotes.

**Architecture:** GitHub Pages serves the static frontend. Supabase Auth protects staff functions, PostgreSQL stores inventory and kiosk data, Storage holds product images, and Row Level Security separates public, kiosk, and staff permissions. Public pages contain no online sales or pawn submission flow.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Supabase JavaScript client, Supabase PostgreSQL, Supabase Storage, GitHub Pages.

## Global Constraints

- Public purchases and pawn services happen in store only.
- Public catalog displays actual prices.
- Kiosk payment happens at the store counter only.
- Kiosk shows confirmed compatible parts first and exposes unverified parts only after an explicit choice.
- Background checks remain in the dealer's existing NICS/4473 system; the website stores workflow metadata only.
- No passwords, service-role keys, Form 4473 answers, or identity-document images are committed or stored in public browser code.
- No assembly instructions are provided.

---

### Task 1: Remove Online Selling and Checkout

**Files:**
- Modify: `README.md`
- Modify: `index.html`
- Modify: `app.js`
- Delete: `sell-pawn.html`
- Delete: `checkout.html`
- Modify: `contact.html`

**Interfaces:**
- Produces: buyer-only navigation and public catalog copy used by every public page.

- [ ] **Step 1: Add a repository test script that asserts forbidden public flows are absent**

Create `tests/site-content.test.mjs` using Node assertions. It must fail while `sell-pawn.html`, `checkout.html`, public cart controls, or online appraisal copy remain.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/site-content.test.mjs`
Expected: FAIL because the old pages and copy still exist.

- [ ] **Step 3: Remove the pages, links, cart drawer, checkout actions, and online appraisal language**

Replace public calls to action with `Shop Inventory`, `Visit the Store`, and `Contact Us`. Keep pawn services described as in-store only.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `node --test tests/site-content.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: make public site catalog only`

### Task 2: Create Supabase Data Model and Security Policies

**Files:**
- Replace: `supabase-schema.sql`
- Modify: `config.js`
- Test: `tests/schema-contract.test.mjs`

**Interfaces:**
- Produces tables `profiles`, `products`, `product_images`, `kiosk_products`, `compatibility_rules`, `kiosk_sessions`, `build_quotes`, `build_quote_items`, and `background_check_status`.

- [ ] **Step 1: Write schema contract tests**

Tests must assert required tables, statuses, public read policies, staff write policies, image bucket policies, and the absence of sensitive Form 4473 fields.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/schema-contract.test.mjs`
Expected: FAIL against the current starter schema.

- [ ] **Step 3: Write the complete migration SQL**

Include enums or constraints, indexes, updated-at triggers, RLS helpers, public catalog policies, staff policies, kiosk quote insert policy, and `product-images` bucket policies.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `node --test tests/schema-contract.test.mjs`
Expected: PASS.

- [ ] **Step 5: Restore Supabase and apply the migration**

Verify project status becomes active and the migration completes without SQL errors.

- [ ] **Step 6: Commit**

Commit message: `feat: add secure catalog and kiosk schema`

### Task 3: Add Public Product Photos and Catalog Data Adapter

**Files:**
- Create: `catalog-data.js`
- Modify: `app.js`
- Modify: `index.html`
- Modify: `shop.html`
- Modify: `styles.css`
- Test: `tests/catalog-data.test.mjs`

**Interfaces:**
- Produces: `CatalogData.loadPublicProducts()` and `CatalogData.normalizeProduct(record)`.

- [ ] **Step 1: Write failing tests for product normalization and photo fallback**

Test actual price preservation, primary image selection, status labels, and fallback illustration behavior.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/catalog-data.test.mjs`
Expected: FAIL because `catalog-data.js` does not exist.

- [ ] **Step 3: Implement the adapter and update cards/modal**

Load Supabase public products when configured. Use seeded sample records as a fallback. Render real image URLs with meaningful alt text and show `Visit store to purchase` instead of cart actions.

- [ ] **Step 4: Seed sample products with actual prices and sample photography**

Seed all public template products with primary image URLs and public-safe descriptions.

- [ ] **Step 5: Run the test and verify GREEN**

Run: `node --test tests/catalog-data.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: add photo-backed public catalog`

### Task 4: Build Staff Authentication and Inventory Admin

**Files:**
- Create: `admin-login.html`
- Replace: `dashboard.html`
- Create: `admin.js`
- Create: `supabase-client.js`
- Modify: `styles.css`
- Test: `tests/admin-contract.test.mjs`

**Interfaces:**
- Produces: `AdminAuth.requireStaff()`, `AdminInventory.saveProduct(formData)`, `AdminInventory.uploadImages(productId, files)`, and `AdminInventory.archiveProduct(id)`.

- [ ] **Step 1: Write failing admin contract tests**

Assert no credential literals, session guard, sign-out action, required product fields, file type/size checks, and archive-not-delete behavior.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/admin-contract.test.mjs`
Expected: FAIL because the secure admin files do not exist.

- [ ] **Step 3: Implement login and session guard**

Use Supabase email/password authentication. Redirect unauthenticated dashboard visits to `admin-login.html`.

- [ ] **Step 4: Implement inventory and photo management**

Provide add/edit/archive, status controls, actual price, product specifications, image preview/upload/removal, and primary-image selection.

- [ ] **Step 5: Create the approved demo administrator securely**

Create the account in Supabase Auth and create an active owner profile without placing credentials in GitHub.

- [ ] **Step 6: Run the test and verify GREEN**

Run: `node --test tests/admin-contract.test.mjs`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: add secure inventory admin`

### Task 5: Build Staff-Activated In-Store Kiosk

**Files:**
- Create: `kiosk.html`
- Create: `kiosk.js`
- Modify: `dashboard.html`
- Modify: `admin.js`
- Modify: `styles.css`
- Test: `tests/kiosk.test.mjs`

**Interfaces:**
- Produces: `KioskCatalog.compatibleParts(platformId)`, `KioskCatalog.allParts(platformId)`, `KioskQuote.validateCustomer(data)`, and `KioskQuote.submit(build)`.

- [ ] **Step 1: Write failing kiosk tests**

Test staff activation, confirmed-compatible-first filtering, explicit show-all behavior, unverified labels, required name/phone/email, no payment controls, and no assembly instructions.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/kiosk.test.mjs`
Expected: FAIL because the kiosk does not exist.

- [ ] **Step 3: Implement staff activation and kiosk lock**

Require an authenticated active staff session to create a time-limited kiosk session. Kiosk mode hides admin controls and provides a visible lock/return-to-staff action.

- [ ] **Step 4: Implement special-order catalog and build quote**

Show platforms, confirmed-compatible parts, optional show-all parts, price estimate, compatibility state, customer details, and notes. Submit a quote only.

- [ ] **Step 5: Add future manufacturer API boundary**

Define a catalog adapter interface that maps external IDs, SKU, manufacturer, model, price, availability, lead time, images, specifications, and compatibility tags to local kiosk records.

- [ ] **Step 6: Run the test and verify GREEN**

Run: `node --test tests/kiosk.test.mjs`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: add in-store special-order kiosk`

### Task 6: Add Quote Review and Background-Check Status Tracking

**Files:**
- Modify: `dashboard.html`
- Modify: `admin.js`
- Test: `tests/quote-workflow.test.mjs`

**Interfaces:**
- Produces: `QuoteWorkflow.review(id, status, notes)` and `QuoteWorkflow.recordBackgroundStatus(id, metadata)`.

- [ ] **Step 1: Write failing workflow tests**

Test review statuses, counter-payment-only language, allowed background statuses, external reference metadata, and rejection of sensitive identity or Form 4473 fields.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/quote-workflow.test.mjs`
Expected: FAIL because workflow actions are missing.

- [ ] **Step 3: Implement staff quote review**

Add approve, request-changes, and decline actions with staff notes and audit entries.

- [ ] **Step 4: Implement background-check metadata panel**

Allow authorized staff to record `not_started`, `proceed`, `delayed`, `denied`, or `cancelled`, date initiated, external reference, follow-up date, and notes.

- [ ] **Step 5: Run the test and verify GREEN**

Run: `node --test tests/quote-workflow.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: add quote and background status workflow`

### Task 7: Deploy and Verify

**Files:**
- Modify: `README.md`
- Verify: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes all prior tasks.

- [ ] **Step 1: Run the complete test suite**

Run: `node --test tests/*.test.mjs`
Expected: all tests pass with zero failures.

- [ ] **Step 2: Verify public and protected routes**

Confirm homepage, shop, contact, admin login, dashboard redirect, and kiosk activation paths.

- [ ] **Step 3: Verify Supabase security**

Confirm anonymous users cannot write products or images, kiosk sessions can submit quotes only, and staff can manage inventory and workflow records.

- [ ] **Step 4: Verify GitHub Pages deployment**

Confirm the Pages workflow completes and the live site returns the updated buyer-focused homepage.

- [ ] **Step 5: Commit final documentation**

Commit message: `docs: describe catalog admin and kiosk features`
