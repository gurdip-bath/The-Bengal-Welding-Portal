-- Profiles table for role-based access (referenced by RLS policies)
create table if not exists public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  primary key (id)
);

alter table public.profiles enable row level security;

alter table public.profiles add column if not exists role text not null default 'customer';

-- Allow users to read their own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
