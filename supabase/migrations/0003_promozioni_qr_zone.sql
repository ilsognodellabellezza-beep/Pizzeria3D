-- =====================================================================
-- Promozioni con date automatiche, codice sconto mostrabile, link QR
-- Eseguire nel SQL Editor di Supabase DOPO 0001 e 0002.
-- =====================================================================

-- Codici sconto: data di inizio + interruttore "mostra sul sito"
alter table public.discount_codes add column if not exists starts_at timestamptz;
alter table public.discount_codes add column if not exists is_visible boolean not null default false;

-- Chiunque può leggere SOLO i codici che il titolare ha scelto di mostrare
drop policy if exists discount_public_visible on public.discount_codes;
create policy discount_public_visible on public.discount_codes for select
  using (is_visible and is_active);

-- Promozioni: compaiono sul sito solo dal giorno di inizio al giorno di fine (inclusi)
create table if not exists public.promotions (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  starts_on     date not null,
  ends_on       date not null,
  discount_code text references public.discount_codes(code) on delete set null on update cascade,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  check (ends_on >= starts_on)
);
alter table public.promotions enable row level security;

drop policy if exists promotions_public_read on public.promotions;
create policy promotions_public_read on public.promotions for select
  using (
    public.is_admin()
    or (is_active and (now() at time zone 'Europe/Rome')::date between starts_on and ends_on)
  );
drop policy if exists promotions_admin_write on public.promotions;
create policy promotions_admin_write on public.promotions for all
  using (public.is_admin()) with check (public.is_admin());

-- Link per i QR code (se vuoti si usano i valori predefiniti del sito)
alter table public.settings add column if not exists reservations_url text;
alter table public.settings add column if not exists app_install_url text;

-- Nuovo nome del locale
alter table public.settings alter column company_name set default 'Epic Pizza';
update public.settings set company_name = 'Epic Pizza' where company_name = 'Nati x la Pizza';
