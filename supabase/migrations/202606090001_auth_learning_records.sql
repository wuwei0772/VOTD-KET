create table if not exists public.saved_words (
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  word_info jsonb not null,
  unit_id text,
  lesson_id text,
  saved_at timestamptz not null default now(),
  primary key (user_id, word)
);

create table if not exists public.learning_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id text not null,
  lesson_id text not null,
  current_word_index integer not null default 0 check (current_word_index >= 0),
  studied_words text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, unit_id, lesson_id)
);

alter table public.saved_words enable row level security;
alter table public.learning_progress enable row level security;

create policy "Users can read their own saved words"
on public.saved_words for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own saved words"
on public.saved_words for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own saved words"
on public.saved_words for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own saved words"
on public.saved_words for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own learning progress"
on public.learning_progress for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own learning progress"
on public.learning_progress for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own learning progress"
on public.learning_progress for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own learning progress"
on public.learning_progress for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists saved_words_user_saved_at_idx
on public.saved_words (user_id, saved_at desc);

create index if not exists learning_progress_user_updated_at_idx
on public.learning_progress (user_id, updated_at desc);
