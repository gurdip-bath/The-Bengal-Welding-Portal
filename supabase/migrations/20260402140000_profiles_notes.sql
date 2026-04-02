-- Internal admin notes per customer profile
alter table public.profiles add column if not exists notes text;
