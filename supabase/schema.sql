-- CareerCommand Hub — cloud sync schema
-- Paste this whole file into the Supabase SQL Editor and click "Run".
--
-- Model: one row per signed-in user holding their entire dataset as JSON
-- (the same shape the app's "Export all data" backup produces). Row-level
-- security guarantees each user can only read/write their own row.

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

-- Each user may read/insert/update/delete only their own row.
drop policy if exists "Users manage their own data" on public.user_data;
create policy "Users manage their own data"
  on public.user_data
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- AI research quota (P0-04)
--
-- The research endpoint costs real money per call, so it needs a per-user
-- ceiling that a user cannot raise by calling the API directly. The limit is
-- therefore hardcoded INSIDE this function rather than passed in as an
-- argument, and the function is SECURITY DEFINER so the counter table stays
-- writable only through it.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.research_usage (
  user_id uuid  not null references auth.users (id) on delete cascade,
  day     date  not null default current_date,
  count   int   not null default 0,
  primary key (user_id, day)
);

alter table public.research_usage enable row level security;

-- Users may SEE their own usage. Nobody writes it directly — only the
-- function below does, and it runs as the definer.
drop policy if exists "Users read their own research usage" on public.research_usage;
create policy "Users read their own research usage"
  on public.research_usage
  for select
  using (auth.uid() = user_id);

/*
 * Atomically claim one research lookup for today.
 *
 * Returns (allowed, used, quota). The conditional UPDATE means a user at the
 * ceiling is not counted again — the number stays truthful — and two
 * simultaneous requests can't both slip through, because the row is locked by
 * the upsert.
 */
create or replace function public.consume_research_quota()
returns table (allowed boolean, used int, quota int)
language plpgsql
security definer
set search_path = public
as $$
declare
  daily_limit constant int := 25;
  new_count int;
  existing  int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.research_usage as u (user_id, day, count)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update
    set count = u.count + 1
    where u.count < daily_limit
  returning u.count into new_count;

  if new_count is null then
    -- The upsert's WHERE filtered the update out: already at the ceiling.
    select u.count into existing
      from public.research_usage u
     where u.user_id = auth.uid() and u.day = current_date;
    return query select false, coalesce(existing, daily_limit), daily_limit;
  else
    return query select true, new_count, daily_limit;
  end if;
end;
$$;

revoke all on function public.consume_research_quota() from public;
grant execute on function public.consume_research_quota() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Self-service account deletion (§7.31)
--
-- "Delete everything" in Data & backup removes the user's records, then calls
-- this to remove the login itself. Removing an auth user normally needs the
-- service-role key, which must never reach a browser, so this runs as the
-- definer and can only ever delete the CALLER (auth.uid()) — there is no
-- argument to point it at anyone else. user_data and research_usage go with it
-- through their ON DELETE CASCADE foreign keys.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
