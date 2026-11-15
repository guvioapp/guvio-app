-- =====================================================================
-- GUVIO · migração 015: idade mínima (13 anos) e proteção de menores
-- Rode inteiro no SQL Editor do Supabase (pode rodar mais de uma vez).
-- =====================================================================

-- a data de nascimento fica numa tabela à parte, que só o próprio usuário lê
-- (o perfil é público; a data de nascimento nunca aparece para ninguém)
create table if not exists public.user_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  birth_date date not null,
  set_at timestamptz not null default now()
);
alter table public.user_private enable row level security;
drop policy if exists "user_private_own" on public.user_private;
create policy "user_private_own" on public.user_private for select using (user_id = auth.uid());
-- sem insert/update direto: só pela função abaixo

-- informa a data de nascimento uma vez (não dá para trocar depois pelo app)
-- menos de 13 anos: recusado e nada é guardado; 13 a 17: conta fica privada
create or replace function public.set_birth_date(p_birth date)
returns text language plpgsql security definer set search_path = public as $$
declare yrs int;
begin
  if auth.uid() is null then raise exception 'entre na sua conta'; end if;
  if exists (select 1 from user_private where user_id = auth.uid()) then return 'already'; end if;
  if p_birth is null or p_birth > current_date or p_birth < current_date - interval '120 years' then
    raise exception 'data_invalida';
  end if;
  yrs := extract(year from age(current_date, p_birth));
  if yrs < 13 then raise exception 'menor_13'; end if;
  insert into user_private (user_id, birth_date) values (auth.uid(), p_birth);
  if yrs < 18 then
    update profiles set is_private = true where id = auth.uid();
    return 'minor';
  end if;
  return 'adult';
end $$;
grant execute on function public.set_birth_date(date) to authenticated;

create or replace function public.my_birth_set()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_private where user_id = auth.uid());
$$;
grant execute on function public.my_birth_set() to authenticated;
