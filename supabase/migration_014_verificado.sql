-- =====================================================================
-- GUVIO · migração 014: selo de verificado
-- Rode inteiro no SQL Editor do Supabase (pode rodar mais de uma vez).
-- =====================================================================

-- 1) o selo fica no perfil
alter table public.profiles add column if not exists verified boolean not null default false;
alter table public.profiles add column if not exists verified_at timestamptz;

-- ninguém se dá o selo editando o próprio perfil: só as funções de admin abaixo mudam
create or replace function public.guard_profile_verified()
returns trigger language plpgsql as $$
begin
  if new.verified is distinct from old.verified
     and coalesce(current_setting('guvio.allow_verify', true), '') <> '1' then
    new.verified := old.verified;
    new.verified_at := old.verified_at;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_verified on public.profiles;
create trigger profiles_guard_verified before update on public.profiles
  for each row execute function public.guard_profile_verified();

-- lista pública de quem é verificado (o app guarda e mostra o ✓ em todo lugar)
create or replace function public.verified_users()
returns table (id uuid, username text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username from profiles p where p.verified;
$$;
grant execute on function public.verified_users() to anon, authenticated;

-- 2) pedidos de verificação
create table if not exists public.verification_requests (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  category text,
  reason text,
  link text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null
);
alter table public.verification_requests enable row level security;
-- sem políticas: só pelas funções abaixo

create or replace function public.request_verification(p_category text, p_reason text, p_link text default null)
returns text language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'entre na sua conta'; end if;
  if exists (select 1 from profiles where id = auth.uid() and verified) then return 'verified'; end if;
  insert into verification_requests (user_id, category, reason, link, status, created_at)
  values (auth.uid(), left(coalesce(p_category, ''), 40), left(coalesce(p_reason, ''), 500), left(coalesce(p_link, ''), 200), 'pending', now())
  on conflict (user_id) do update
    set category = excluded.category, reason = excluded.reason, link = excluded.link,
        status = 'pending', created_at = now(), decided_at = null, decided_by = null
    where verification_requests.status <> 'pending';
  return 'pending';
end $$;
grant execute on function public.request_verification(text, text, text) to authenticated;

create or replace function public.my_verification()
returns text language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from profiles where id = auth.uid() and verified) then 'verified'
    else (select status from verification_requests where user_id = auth.uid())
  end;
$$;
grant execute on function public.my_verification() to authenticated;

create or replace function public.admin_list_verification()
returns table (user_id uuid, username text, avatar_url text, followers bigint, category text, reason text, link text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from app_admins a where a.user_id = auth.uid()) then raise exception 'sem permissão'; end if;
  return query
    select r.user_id, p.username, p.avatar_url,
           (select count(*) from follows f where f.following_id = r.user_id),
           r.category, r.reason, r.link, r.created_at
    from verification_requests r join profiles p on p.id = r.user_id
    where r.status = 'pending'
    order by r.created_at;
end $$;
grant execute on function public.admin_list_verification() to authenticated;

-- dar ou tirar o selo (aprova/recusa o pedido junto, se houver)
create or replace function public.admin_set_verified(p_user uuid, p_verified boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from app_admins where user_id = auth.uid()) then raise exception 'sem permissão'; end if;
  perform set_config('guvio.allow_verify', '1', true);
  update profiles set verified = p_verified, verified_at = case when p_verified then now() else null end where id = p_user;
  update verification_requests
    set status = case when p_verified then 'approved' else 'denied' end, decided_at = now(), decided_by = auth.uid()
    where user_id = p_user and status = 'pending';
end $$;
grant execute on function public.admin_set_verified(uuid, boolean) to authenticated;
