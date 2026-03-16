-- Store requester display name on stock_requests so admin list can show names without depending on user list API
alter table public.stock_requests
  add column if not exists requested_by_name text null;
