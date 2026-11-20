-- =====================================================================
-- Permessi sulle tabelle per i ruoli di Supabase
-- I progetti Supabase nuovi non concedono più in automatico i privilegi
-- su public.* ad anon/authenticated/service_role: senza questi GRANT
-- si ottiene "permission denied for table ...".
-- La sicurezza vera resta nelle policy RLS già attive su ogni tabella.
-- Eseguire nel SQL Editor DOPO 0001, 0002 e 0003.
-- =====================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Lettura: le policy RLS decidono cosa vede davvero ciascun ruolo
grant select on all tables in schema public to anon, authenticated;

-- Scrittura: solo utenti loggati (le policy limitano a staff/admin o ai propri dati)
grant insert, update, delete on all tables in schema public to authenticated;

-- Il server (chiave sb_secret / service role) ha accesso completo
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated;

-- Funzioni usate dalle policy RLS
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_staff() to anon, authenticated, service_role;

-- Le funzioni dei codici sconto restano riservate al server
grant execute on function public.redeem_discount(text) to service_role;
grant execute on function public.release_discount(text) to service_role;

-- Tabelle e sequenze create in futuro
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
