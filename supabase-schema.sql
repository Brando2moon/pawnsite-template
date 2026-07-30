-- Northline Pawn & Exchange starter schema
-- Review and harden all policies before production use.

create extension if not exists pgcrypto;

create type public.product_status as enum ('draft','available','reserved','sold','returned','archived');
create type public.purchase_mode as enum ('cart','reserve','contact');
create type public.request_status as enum ('new','assigned','contacted','scheduled','completed','declined','closed');
create type public.order_status as enum ('pending','payment_pending','paid','ready_for_pickup','shipped','completed','cancelled','refunded');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  category_id uuid references public.categories(id),
  name text not null,
  slug text unique not null,
  public_description text,
  internal_notes text,
  price_cents integer check (price_cents >= 0),
  status public.product_status not null default 'draft',
  purchase_mode public.purchase_mode not null default 'cart',
  condition_label text,
  brand text,
  model text,
  quantity integer not null default 1 check (quantity >= 0),
  public_metadata jsonb not null default '{}'::jsonb,
  private_metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.pawn_requests (
  id uuid primary key default gen_random_uuid(),
  status public.request_status not null default 'new',
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  category text not null,
  brand_model text,
  condition_label text,
  intent text,
  description text not null,
  assigned_to uuid references auth.users(id),
  staff_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pawn_request_images (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.pawn_requests(id) on delete cascade,
  private_storage_path text not null,
  mime_type text,
  byte_size bigint,
  scan_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.firearm_requests (
  id uuid primary key default gen_random_uuid(),
  status public.request_status not null default 'new',
  product_id uuid references public.products(id),
  full_name text not null,
  phone text not null,
  email text not null,
  state_of_residence text not null,
  inquiry text not null,
  assigned_to uuid references auth.users(id),
  staff_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  public_order_number text unique not null,
  status public.order_status not null default 'pending',
  customer_email text not null,
  customer_phone text,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  fulfillment_method text not null,
  payment_provider text,
  payment_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name_snapshot text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null default 1 check (quantity > 0)
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  topic text,
  message text not null,
  status public.request_status not null default 'new',
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index products_public_catalog_idx on public.products(status, category_id, published_at desc);
create index pawn_requests_queue_idx on public.pawn_requests(status, created_at);
create index firearm_requests_queue_idx on public.firearm_requests(status, created_at);
create index orders_queue_idx on public.orders(status, created_at);

alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.pawn_requests enable row level security;
alter table public.pawn_request_images enable row level security;
alter table public.firearm_requests enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.contact_messages enable row level security;
alter table public.audit_log enable row level security;

create policy "public can view available public products"
on public.products for select
to anon, authenticated
using (status = 'available' and published_at is not null);

create policy "public can view public product images"
on public.product_images for select
to anon, authenticated
using (is_public = true);

-- Implement public form submissions through validated, rate-limited server routes.
