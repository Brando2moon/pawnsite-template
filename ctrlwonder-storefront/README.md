# CTRL Wonder Studio storefront

A responsive black-and-purple storefront prototype built from the supplied visual reference.

## Where the code is
Open **index.html** in this folder. This is a single-file HTML/CSS/JavaScript storefront that works on GitHub Pages, Vercel, Netlify, or any static hosting service.

## Features
- Responsive hero, navigation and mobile menu
- Product category filters, search and sorting
- Product detail modal with size selection
- Shopping cart with persistent browser storage, quantities and subtotal
- Original CTRL Wonder Studio branding and contact link

## IMPORTANT: Demo, not live commerce
The products, prices, photographs, inventory, and stars are **sample data** only. No customer payments or Printify orders are processed. Checkout is intentionally disabled.

To launch real commerce:
1. Create or configure a Printify shop and populate its actual products/variants.
2. Deploy a secure backend. **Never expose the Printify API token or Stripe secret key in the HTML or a public repository.**
3. Fetch published Printify catalog information server-side and map real variant IDs, sizing, production availability and prices to your storefront.
4. Build a Stripe Checkout Session endpoint using verified prices, plus a Stripe webhook that verifies signatures, records orders and prevents duplicate fulfillment.
5. Upon verified payment, submit the matching Printify order server-side; implement retry/idempotency, address validation, error handling, and tracking updates.
6. Add sales tax, returns/refunds, privacy and shipping policies before accepting customers.
7. Replace the sample images with licensed art and actual Printify mockups.

## Deployment via GitHub Pages
This folder can be published as a separate GitHub Pages site if moved to the repository root or a /docs folder on the Pages publishing branch, or deployed as a subfolder with a host that allows selecting this directory.

Contact: ctrlwonderstudio@gmail.com
