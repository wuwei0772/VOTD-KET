-- Review book (Leitner) per-word progress.
create table public.word_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null,
  status text not null default 'learning' check (status in ('learning', 'mastered')),
  box smallint not null default 1,
  next_due date,
  wrong_count integer not null default 0,
  unit_id text,
  lesson_id text,
  first_seen_at timestamptz not null default now(),
  mastered_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, word)
);

alter table public.word_progress enable row level security;

create policy "Users manage own word progress"
  on public.word_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- One row per day with any quiz/review activity (drives the streak).
create table public.daily_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

alter table public.daily_activity enable row level security;

create policy "Users manage own daily activity"
  on public.daily_activity for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
