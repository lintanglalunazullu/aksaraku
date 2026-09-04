create table if not exists public.profiles (
  id uuid primary key,
  email text not null,
  full_name text not null,
  role text not null default 'user' check (role in ('admin', 'user', 'teacher')),
  provider text not null default 'email',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists avatar_url text;

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "profiles_read_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_own_or_admin"
on public.profiles for insert
to authenticated
with check (id = auth.uid() or public.is_admin());

create policy "profiles_update_admin_or_own"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (lower(email));

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, provider, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_app_meta_data ->> 'provider', 'email'),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

insert into public.profiles (id, email, full_name, provider, role)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', ''),
  coalesce(raw_app_meta_data ->> 'provider', 'email'),
  'user'
from auth.users
on conflict (id) do nothing;

-- Seed/update the first administrator manually after replacing the UUID and email.
-- insert into public.profiles (id, email, full_name, role, provider)
-- values ('AUTH_USER_UUID', 'admin@example.com', 'Administrator', 'admin', 'email')
-- on conflict (id) do update set role = excluded.role;
