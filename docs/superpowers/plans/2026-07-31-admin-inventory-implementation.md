# Admin Inventory and Product Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure Supabase authentication, a working seller inventory dashboard, product-photo uploads, real storefront product images, and database-backed inventory to the deployed pawn-shop template.

**Architecture:** GitHub Pages remains the static frontend. Supabase provides email/password authentication, PostgreSQL inventory storage, Row Level Security, and a public `product-images` Storage bucket. Public pages read only public inventory; authenticated active staff can create and update inventory and upload images.

**Tech Stack:** Static HTML/CSS/JavaScript, Supabase JavaScript client v2, Supabase Auth, PostgreSQL, Supabase Storage, GitHub Pages, Node.js built-in test runner.

## Global Constraints

- Never commit a password, service-role key, or private token to GitHub.
- Only the Supabase project URL and publishable key may be present in browser configuration.
- Firearm products remain inquiry-only and cannot enter ordinary checkout.
- Product images accept JPEG, PNG, or WebP only, maximum 8 MB each, maximum 8 per product.
- Normal removal uses `archived` status rather than permanent deletion.
- Public pages show only `available` and `reserved` products.
- README remains client-facing and must not contain credentials or implementation secrets.

---

### Task 1: Supabase Project, Tables, Policies, and Demo Admin

**Files:**
- Create: `supabase/admin-inventory-migration.sql`
- Test: Supabase SQL policy checks run with anonymous and authenticated contexts

**Interfaces:**
- Produces tables: `profiles`, `products`, `product_images`, `audit_logs`
- Produces bucket: `product-images`
- Produces helper: `public.is_active_staff()` returning boolean
- Produces public product query shape consumed by `inventory-api.js`

- [ ] **Step 1: Restore the existing Supabase project**

Use project ID `vhxmczybvvsolbgmprzk` and wait until status is `ACTIVE_HEALTHY`.

- [ ] **Step 2: Write the migration**

Create `supabase/admin-inventory-migration.sql` with:

```sql
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default 'Staff User',
  role text not null default 'admin' check (role in ('owner','admin','inventory')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null,
  brand text not null default '',
  description text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  condition text not null default '',
  badge text not null default '',
  status text not null default 'draft' check (status in ('draft','available','reserved','sold','archived')),
  purchase_mode text not null default 'cart' check (purchase_mode in ('cart','reserve','contact')),
  specifications jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  public_url text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index if not exists one_primary_image_per_product
  on public.product_images(product_id)
  where is_primary;

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.audit_logs enable row level security;

create policy "public reads public products"
on public.products for select
to anon, authenticated
using (status in ('available','reserved') or public.is_active_staff());

create policy "staff writes products"
on public.products for all
to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

create policy "public reads images for public products"
on public.product_images for select
to anon, authenticated
using (
  public.is_active_staff() or exists (
    select 1 from public.products p
    where p.id = product_id and p.status in ('available','reserved')
  )
);

create policy "staff writes images"
on public.product_images for all
to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

create policy "staff reads own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_active_staff());

create policy "staff reads audit logs"
on public.audit_logs for select
to authenticated
using (public.is_active_staff());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads product image objects"
on storage.objects for select
to public
using (bucket_id = 'product-images');

create policy "staff uploads product image objects"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_active_staff());

create policy "staff updates product image objects"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and public.is_active_staff())
with check (bucket_id = 'product-images' and public.is_active_staff());

create policy "staff deletes product image objects"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and public.is_active_staff());
```

- [ ] **Step 3: Apply the migration and create the demo Auth user securely**

Create `admin@northlinepawn.com` in Supabase Auth using the user-approved temporary password. Insert the resulting user UUID into `public.profiles` with `role = 'owner'` and `is_active = true`. Do not write the password to any file, issue, commit, or final response.

- [ ] **Step 4: Verify RLS**

Run anonymous queries proving public users can select public products but cannot insert or update. Run authenticated queries proving the active staff account can insert and update.

- [ ] **Step 5: Commit the migration**

```bash
git add supabase/admin-inventory-migration.sql
git commit -m "feat: add secure inventory database policies"
```

---

### Task 2: Supabase Client and Inventory Data Module

**Files:**
- Modify: `config.js`
- Create: `supabase-client.js`
- Create: `inventory-api.js`
- Create: `tests/inventory-api.test.mjs`

**Interfaces:**
- Produces `window.PawnSupabase.getClient()`
- Produces `window.InventoryAPI.listPublicProducts()`
- Produces `window.InventoryAPI.listAdminProducts()`
- Produces `window.InventoryAPI.saveProduct(payload)`
- Produces `window.InventoryAPI.archiveProduct(id)`
- Produces `window.InventoryAPI.uploadImages(productId, files, altText)`

- [ ] **Step 1: Write failing data-normalization tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProduct, validateImageFile } from '../inventory-api-core.mjs';

test('normalizeProduct maps Supabase rows to storefront shape', () => {
  const row = {
    id: 'p1', name: 'Camera', category: 'electronics', brand: 'Imaging',
    price: '620.00', condition: 'Very good', badge: 'Inspected',
    purchase_mode: 'cart', description: 'Tested', specifications: { Storage: 'N/A' },
    product_images: [{ public_url: 'https://img.example/camera.webp', alt_text: 'Camera', is_primary: true, sort_order: 0 }]
  };
  assert.deepEqual(normalizeProduct(row), {
    id: 'p1', name: 'Camera', category: 'electronics', brand: 'Imaging',
    price: 620, condition: 'Very good', badge: 'Inspected', purchaseMode: 'cart',
    description: 'Tested', specs: { Storage: 'N/A' },
    images: [{ url: 'https://img.example/camera.webp', alt: 'Camera', primary: true }],
    primaryImage: 'https://img.example/camera.webp'
  });
});

test('validateImageFile rejects unsupported and oversized files', () => {
  assert.equal(validateImageFile({ type: 'image/gif', size: 10 }).ok, false);
  assert.equal(validateImageFile({ type: 'image/jpeg', size: 8 * 1024 * 1024 + 1 }).ok, false);
  assert.equal(validateImageFile({ type: 'image/webp', size: 5000 }).ok, true);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/inventory-api.test.mjs`
Expected: FAIL because `inventory-api-core.mjs` does not exist.

- [ ] **Step 3: Add the pure data module and browser adapter**

Create `inventory-api-core.mjs` exporting `normalizeProduct(row)` and `validateImageFile(file)` using exact limits from Global Constraints. Create `supabase-client.js` that initializes one client from `PAWN_CONFIG.supabaseUrl` and `PAWN_CONFIG.supabasePublishableKey`. Create `inventory-api.js` that performs the Supabase queries and uses `normalizeProduct`.

The public query must be:

```js
client
  .from('products')
  .select('id,name,category,brand,price,condition,badge,purchase_mode,description,specifications,status,product_images(public_url,alt_text,is_primary,sort_order)')
  .in('status', ['available', 'reserved'])
  .order('created_at', { ascending: false });
```

- [ ] **Step 4: Run tests to verify pass**

Run: `node --test tests/inventory-api.test.mjs`
Expected: PASS with 2 tests and 0 failures.

- [ ] **Step 5: Commit**

```bash
git add config.js supabase-client.js inventory-api.js inventory-api-core.mjs tests/inventory-api.test.mjs
git commit -m "feat: add Supabase inventory client"
```

---

### Task 3: Real Product Photos on Storefront

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Modify: `shop.html`
- Modify: `styles.css`
- Create: `tests/storefront-render.test.mjs`

**Interfaces:**
- Consumes `InventoryAPI.listPublicProducts()`
- Produces product cards and product modal galleries using `primaryImage` and `images`

- [ ] **Step 1: Write failing rendering tests**

Extract `productMediaMarkup(product)` into `storefront-render.mjs` and test:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { productMediaMarkup } from '../storefront-render.mjs';

test('renders a real image when primaryImage exists', () => {
  const html = productMediaMarkup({ name: 'Camera', category: 'electronics', primaryImage: '/camera.webp' });
  assert.match(html, /<img/);
  assert.match(html, /camera\.webp/);
});

test('renders the category fallback when there is no image', () => {
  const html = productMediaMarkup({ name: 'Camera', category: 'electronics', primaryImage: '' });
  assert.match(html, /product-fallback/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/storefront-render.test.mjs`
Expected: FAIL because `storefront-render.mjs` does not exist.

- [ ] **Step 3: Implement photo rendering and async inventory load**

Update `app.js` so initialization awaits `InventoryAPI.listPublicProducts()`. Replace hardcoded catalog use after successful loading. Show an inventory error panel when loading fails. Product cards use `<img loading="lazy">`; product modals show a primary image and clickable gallery thumbnails. Preserve the category illustration only as a no-photo fallback.

Add these scripts before `app.js` on storefront pages:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script type="module" src="inventory-api-core.mjs"></script>
<script src="config.js"></script>
<script src="supabase-client.js"></script>
<script src="inventory-api.js"></script>
<script src="app.js"></script>
```

- [ ] **Step 4: Add responsive image styles**

Add `.product-media img`, `.product-modal-image`, `.product-gallery`, and `.gallery-thumb` rules with `object-fit: cover`, consistent aspect ratios, keyboard-visible focus, and mobile wrapping.

- [ ] **Step 5: Run tests and static-link checks**

Run:

```bash
node --test tests/storefront-render.test.mjs tests/inventory-api.test.mjs
node --check app.js
```

Expected: all tests pass and `node --check` exits 0.

- [ ] **Step 6: Commit**

```bash
git add app.js index.html shop.html styles.css storefront-render.mjs tests/storefront-render.test.mjs
git commit -m "feat: display product photos from inventory"
```

---

### Task 4: Protected Login and Working Seller Dashboard

**Files:**
- Create: `admin-login.html`
- Create: `admin-auth.js`
- Replace: `dashboard.html`
- Create: `admin-dashboard.js`
- Modify: `styles.css`
- Create: `tests/admin-validation.test.mjs`

**Interfaces:**
- Consumes `PawnSupabase.getClient()` and `InventoryAPI`
- Produces authenticated dashboard session guard
- Produces add/edit/archive product workflow
- Produces multi-image upload workflow

- [ ] **Step 1: Write failing admin validation tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductInput, makeSlug } from '../admin-validation.mjs';

test('valid product passes', () => {
  assert.equal(validateProductInput({
    name: 'Console Bundle', category: 'gaming', price: '449',
    condition: 'Very good', status: 'available', purchaseMode: 'cart'
  }).ok, true);
});

test('negative price and missing name fail', () => {
  const result = validateProductInput({ name: '', category: 'gaming', price: '-1', condition: '', status: 'draft', purchaseMode: 'cart' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.name);
  assert.ok(result.errors.price);
});

test('makeSlug creates stable URL-safe text', () => {
  assert.equal(makeSlug('Diamond Cluster Ring'), 'diamond-cluster-ring');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/admin-validation.test.mjs`
Expected: FAIL because `admin-validation.mjs` does not exist.

- [ ] **Step 3: Implement login page and session guard**

`admin-login.html` contains email, password, show-password toggle, submit button, and status area. `admin-auth.js` calls `signInWithPassword`, redirects successful login to `dashboard.html`, and never contains credentials. On dashboard load, call `getSession`; redirect missing sessions to `admin-login.html`. Query `profiles` and reject inactive users.

- [ ] **Step 4: Implement inventory dashboard**

Replace the prototype table with live rows. Include search, status filter, Add Item, Edit, Archive, Sign Out, and an item editor dialog. The editor includes all approved fields and a file input with `accept="image/jpeg,image/png,image/webp"` and `multiple`.

Save sequence:

1. Validate fields.
2. Disable Save controls.
3. Insert or update the product.
4. Validate each selected image.
5. Upload images under `${productId}/${crypto.randomUUID()}-${safeFileName}`.
6. Insert `product_images` records.
7. Set the first uploaded image as primary when no primary exists.
8. Refresh inventory and show success.
9. Re-enable controls in `finally`.

- [ ] **Step 5: Add image preview, primary selection, and archive confirmation**

Use `URL.createObjectURL` for local previews and revoke URLs when the editor closes. Existing images display with radio controls for primary image and remove buttons. Archive requires a confirmation dialog and updates status to `archived`.

- [ ] **Step 6: Run tests and syntax checks**

Run:

```bash
node --test tests/admin-validation.test.mjs tests/inventory-api.test.mjs tests/storefront-render.test.mjs
node --check admin-auth.js
node --check admin-dashboard.js
```

Expected: all tests pass and both syntax checks exit 0.

- [ ] **Step 7: Commit**

```bash
git add admin-login.html admin-auth.js dashboard.html admin-dashboard.js admin-validation.mjs styles.css tests/admin-validation.test.mjs
git commit -m "feat: add secure seller inventory dashboard"
```

---

### Task 5: Seed Product Records and Product Photography

**Files:**
- Create: `supabase/seed-products.sql`
- Upload: eight product photographs to Supabase Storage

**Interfaces:**
- Produces live sample catalog records and primary image records consumed by the storefront

- [ ] **Step 1: Create eight professional catalog images**

Prepare one clean marketplace-style image for each sample item: automatic watch, console bundle, mirrorless camera kit, tool kit, electric guitar, diamond ring, inquiry-only sporting rifle, and premium laptop. Use neutral gray studio backgrounds and consistent 4:3 framing. Do not place text, pricing, watermarks, people, or visible firearm serial numbers in images.

- [ ] **Step 2: Seed product rows**

Create `supabase/seed-products.sql` with idempotent `insert ... on conflict (slug) do update` statements for the eight sample products. Firearm seed data must use `purchase_mode = 'reserve'` and `status = 'available'`.

- [ ] **Step 3: Upload and connect images**

Upload each optimized WebP image to `product-images/demo/<slug>.webp`. Insert one `product_images` row per product with `is_primary = true`, `sort_order = 0`, and descriptive alt text.

- [ ] **Step 4: Verify storefront data**

Query all public products and confirm each row has a primary image URL. Verify the firearm product cannot be added to the cart.

- [ ] **Step 5: Commit the seed file**

```bash
git add supabase/seed-products.sql
git commit -m "feat: seed photographed demo inventory"
```

---

### Task 6: Live Deployment and Security Verification

**Files:**
- Modify only files required by failed verification

**Interfaces:**
- Verifies the complete system from login through public storefront

- [ ] **Step 1: Run the full local verification suite**

```bash
node --test tests/*.test.mjs
node --check app.js
node --check admin-auth.js
node --check admin-dashboard.js
```

Expected: all tests pass, 0 failures, and all syntax checks exit 0.

- [ ] **Step 2: Run Supabase security advisors**

Run security and performance advisors. Resolve any missing RLS, unsafe function search path, or storage-policy findings caused by this change.

- [ ] **Step 3: Push to `main` and wait for GitHub Pages deployment**

Confirm the Pages workflow completes successfully for the final commit.

- [ ] **Step 4: Verify live behavior**

Check:

- Public homepage shows real product photos.
- Shop filters still work.
- Product modal gallery works on desktop and mobile.
- `dashboard.html` redirects signed-out visitors.
- Demo admin can sign in.
- Admin can add a photographed product and publish it.
- Published product appears on the public shop.
- Admin can edit, reserve, sell, and archive the product.
- Invalid credentials are rejected.
- Public users cannot write to products or Storage.
- Firearm products remain inquiry-only.
- Sign out invalidates dashboard access.

- [ ] **Step 5: Record final verification evidence**

Save the exact test output, Supabase advisor status, deployment result, and live URL in the completion summary. Do not include the password.
