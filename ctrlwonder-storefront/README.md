# CTRL Wonder Studio — storefront + admin

Reference-inspired black-and-purple storefront with shared Supabase product inventory and click events.

## URLs (once GitHub Pages is enabled)
- Storefront: https://brando2moon.github.io/pawnsite-template/
- Admin: https://brando2moon.github.io/pawnsite-template/admin.html
- GitHub Pages settings: https://github.com/Brando2moon/pawnsite-template/settings/pages

GitHub Pages settings: deploy from branch `gh-pages` and directory `/(root)`.

## Dashboard access
The admin page uses **Supabase Auth**. Admin access is restricted by database Row Level Security policies to the authenticated email `ctrlwonderstudio@gmail.com`.

**First-time setup:** In [Supabase Auth users](https://supabase.com/dashboard/project/vhxmczybvvsolbgmprzk/auth/users), invite/create the admin user for this email, then sign in to the admin page with that user's password. For email-link sign-in, allow `https://brando2moon.github.io/pawnsite-template/admin.html` under [Auth URL configuration](https://supabase.com/dashboard/project/vhxmczybvvsolbgmprzk/auth/url-configuration).

The GitHub website source contains only the **public publishable key**; do not add service-role, Printify, or Stripe secret keys to this repository.

## Shared data
Tables created in existing active Supabase project `vhxmczybvvsolbgmprzk`:
- `public.ctrlwonder_products`: inventory and sample pricing; product changes propagate to all visitors on page reload.
- `public.ctrlwonder_events`: page_view, product_view, add_to_cart, checkout_click, nav_click. Readable by the authenticated admin only; anonymous visitors can write allowlisted action events.

The initial 8 products are **fake demonstration inventory** with third-party placeholder photos. Sample listing prices and stars are not verified customer ratings. Replace with actual Printify mockups and variants before trading.

## Important
- The checkout control deliberately does not accept money.
- Product click counts do NOT represent completed sales or unique visitors.
- Unauthenticated event submission can be spammed. Add server-side bot protection/rate limiting before depending on public analytics at scale.
- This is a static website, **not** a complete Printify integration. Real checkout requires secure Stripe backend, webhook verification, Printify order synchronization, tracking, tax and refund policies.
