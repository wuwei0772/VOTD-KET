-- One row per user per local calendar day with any quiz/review activity.
-- Drives the streak (consecutive active days) display, per user, across
-- devices.
create table if not exists public.daily_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

alter table public.daily_activity enable row level security;

create policy "Users can read their own activity"
on public.daily_activity for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own activity"
on public.daily_activity for insert
to authenticated
with check ((select auth.uid()) = user_id);

create index if not exists daily_activity_user_day_idx
on public.daily_activity (user_id, day desc);
