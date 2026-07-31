# Buyer Catalog, In-Store Kiosk, and Admin Design

## Goal

Turn the template into a buyer-focused pawn-shop catalog with real prices, product photos, a secure staff admin area, and a separate in-store firearm special-order kiosk.

## Public website

The public website is a product catalog only.

Customers can:

- Browse in-stock merchandise
- See actual prices
- View product photos, condition, descriptions, specifications, and availability
- Search, filter, and sort products
- Contact the store
- See that purchases and pawn services are completed in store

The public website will not include:

- Online pawn or sell forms
- Online cart or checkout
- Online firearm purchase or transfer

Pawn services will be described as in-store only.

## Public inventory states

- `available`: shown with price and "In stock"
- `reserved`: shown with price and "Reserved"
- `sold`: may remain visible as "Sold" when staff chooses to display it
- `draft` and `archived`: never shown publicly

## Admin area

Authorized staff sign in through Supabase Auth. The admin dashboard manages:

- Public in-stock products
- Product photos
- Name, category, brand, price, condition, description, specifications, and status
- Special-order kiosk catalog products
- Manufacturer or distributor identifiers for future API syncing
- Compatibility relationships between firearm platforms and parts
- Submitted kiosk quotes
- Background-check workflow status
- Kiosk activation, lock, and sign-out

Credentials are never stored in the public repository.

## Product photos

The public storefront uses a primary product image and optional gallery images. Staff can upload JPEG, PNG, or WebP files from the admin product editor. The template begins with sample product photography and allows every image to be replaced.

## In-store kiosk

The kiosk is a separate page intended for a store-owned tablet or kiosk. It is not linked as a normal public shopping page.

A staff member signs in, activates kiosk mode, and then hands the device to a customer. The customer can:

- Browse the special-order firearm and parts catalog
- Choose a firearm platform
- See manufacturer-confirmed compatible parts first
- Choose "Show all parts" to see unverified options
- Add notes
- Enter full name, phone number, and email
- Submit a quote request

The kiosk does not take payment, complete a transfer, provide assembly instructions, or perform a background check.

## Manufacturer API readiness

Catalog records support:

- External product ID
- SKU or manufacturer part number
- Manufacturer
- Model
- Category
- Price
- Availability
- Lead time
- Image URL
- Specifications
- Compatibility tags
- Last-synced timestamp
- Manual override flag

A future manufacturer or distributor adapter can sync these fields without changing the kiosk interface.

## Quote workflow

1. Customer submits a build quote.
2. Staff reviews compatibility, availability, pricing, and customer notes.
3. Staff approves, requests changes, or declines the quote.
4. Payment happens only at the store counter.
5. Staff completes the legal transaction in the store's approved systems.

## Background-check tracking

The website does not run NICS or store Form 4473 answers. Authorized staff use the store's existing NICS/4473 system and record only workflow metadata in the admin dashboard:

- Quote number
- Staff member
- Status: `not_started`, `proceed`, `delayed`, `denied`, or `cancelled`
- Date initiated
- External transaction or reference number
- Follow-up or expiration date
- Staff notes

No sensitive buyer answers or identity-document images are stored in the normal website database.

## Payments

The public website and kiosk do not accept payment. The architecture keeps a payment-provider boundary for a future approved in-store counter integration, but no Stripe checkout or online firearm payment is enabled.

## Data and security

Supabase provides authentication, PostgreSQL data, Row Level Security, and product-image storage.

- Public users can read only public catalog records
- Approved staff can create and update inventory, kiosk products, compatibility records, quotes, and workflow status
- Kiosk mode can create a quote but cannot read staff-only records
- Service-role keys never appear in browser code
- Firearm and regulated-item records remain inquiry and quote only

## Pages

- `index.html`: buyer-focused homepage
- `shop.html`: public in-stock catalog with actual prices
- `contact.html`: store contact and in-store service information
- `admin-login.html`: staff sign-in
- `dashboard.html`: product, photo, kiosk catalog, quote, and workflow management
- `kiosk.html`: staff-activated special-order builder

The online sell/pawn page and checkout page are removed.

## Success criteria

- Every sample public product has a photo and actual price
- No online pawn, sell, cart, or checkout flow remains
- Public catalog clearly says purchases happen in store
- Staff can sign in and manage products and photos
- Staff can activate and lock kiosk mode
- Kiosk shows confirmed compatible parts first and all parts only after an explicit choice
- Kiosk submissions collect name, phone, and email
- Quotes appear in the staff dashboard
- Staff can record background-check workflow metadata without storing sensitive Form 4473 data
- The code is ready for a future manufacturer catalog adapter
