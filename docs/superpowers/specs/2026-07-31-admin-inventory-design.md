# Secure Admin Inventory and Product Images Design

## Goal

Turn the existing static pawn-shop template into a secure, Supabase-backed storefront where authorized staff can sign in, add products, upload photos, edit descriptions and prices, and control whether an item is available, reserved, sold, or archived.

## Approved demo account

- Demo email: `admin@northlinepawn.com`
- Temporary password: stored only in Supabase authentication, never committed to GitHub
- The fake email is for demonstration only and cannot receive password-reset messages
- Before client launch, replace it with a real owner email and a stronger password

## Architecture

### Frontend

The existing GitHub Pages site remains the public frontend. It will load the Supabase JavaScript client using the project URL and publishable key from `config.js`.

Public pages will read only products marked `available` or `reserved` from Supabase. The current hardcoded catalog will remain only as a temporary fallback during migration and will be removed after database loading is verified.

### Authentication

Supabase Auth will handle email-and-password login. A new `admin-login.html` page will provide the sign-in form. `dashboard.html` will verify an active authenticated session before showing any admin content. Unauthenticated users will be redirected to the login page.

Authorization will not rely only on hiding the dashboard. Row Level Security policies will require an authenticated user with an approved staff profile for product and image writes.

### Database

The storefront will use these main tables:

- `profiles`: user ID, email, display name, role, active state
- `products`: name, slug, category, brand, description, price, condition, status, badge, purchase mode, specifications, timestamps
- `product_images`: product ID, storage path, public URL, sort order, alt text, primary-image flag
- `audit_logs`: user, action, entity type, entity ID, and timestamp

Product statuses:

- `draft`
- `available`
- `reserved`
- `sold`
- `archived`

Purchase modes:

- `cart` for ordinary merchandise
- `reserve` for request-only regulated inventory
- `contact` for items requiring direct staff contact

### Image storage

A Supabase Storage bucket named `product-images` will hold public storefront images. Uploads will be restricted to authenticated staff.

Accepted files:

- JPEG
- PNG
- WebP
- Maximum 8 MB per image
- Up to 8 images per product

The admin interface will support image preview, removal, primary-image selection, and display-order control. Storefront cards use the primary image and fall back to the existing category illustration when no image exists.

## Admin interface

### Login page

- Email field
- Password field
- Show/hide password control
- Sign-in button
- Clear invalid-login and connection-error messages
- No password embedded in HTML or JavaScript

### Dashboard overview

- Available inventory count
- Draft count
- Reserved count
- Sold count
- Add inventory button
- Inventory table with search and status filters
- Edit and archive actions
- Sign-out button

### Product editor

Fields:

- Product name
- Category
- Brand
- Price
- Condition
- Badge
- Status
- Purchase mode
- Short description
- Detailed specifications
- Multiple product photos
- Image alt text

Actions:

- Save draft
- Publish as available
- Update existing item
- Mark reserved
- Mark sold
- Archive item

Deleting records permanently will not be the normal workflow. Archive is safer for audit history and one-of-one inventory tracking.

## Public storefront data flow

1. Page loads Supabase configuration.
2. The storefront requests products with public statuses.
3. Product and primary-image records are joined.
4. Cards render real photos when available.
5. Product details render the image gallery, description, price, condition, and specifications.
6. Cart eligibility continues to depend on `purchase_mode`.

If Supabase is temporarily unavailable, the site shows a clear inventory-loading message rather than silently presenting stale pricing.

## Security

- No service-role key in GitHub or browser code
- Only the publishable client key may appear in `config.js`
- Row Level Security enabled on every application table
- Public users receive read-only access to public inventory
- Authenticated approved staff receive create and update access
- Storage upload, replace, and delete operations require an approved staff profile
- Dashboard routing and database policies both enforce authentication
- Regulated inventory remains inquiry-only and cannot enter ordinary checkout
- Public product records never expose complete serial numbers or sensitive compliance records

## Error handling

- Login errors are shown without exposing internal details
- Product saves report validation failures and database errors
- Failed image uploads do not discard successfully saved product text
- Partial uploads can be retried
- Unsaved changes trigger a warning before leaving the editor
- Duplicate submissions are prevented while a save is in progress

## Testing and verification

- Login succeeds with the approved temporary demo account
- Invalid credentials are rejected
- Unauthenticated dashboard access redirects to login
- An admin can create, edit, publish, reserve, sell, and archive a product
- Image type, count, and size limits are enforced
- A primary image appears on the storefront
- Products without images use a fallback illustration
- Public users cannot write to products or storage
- Regulated products cannot be added to the ordinary cart
- Sign-out invalidates the dashboard session
- GitHub Pages deployment completes and the live site loads Supabase inventory

## Rollout

1. Restore the existing Supabase project.
2. Apply the database, Row Level Security, and storage policies.
3. Create the temporary demo administrator securely in Supabase Auth.
4. Seed the current sample products and add professional product images.
5. Add the login page and convert the dashboard into a working inventory manager.
6. Replace hardcoded storefront data with Supabase reads.
7. Verify security policies and live deployment.
8. Replace the fake account with the client’s real email before production use.
