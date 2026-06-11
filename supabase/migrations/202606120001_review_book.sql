-- Review book: per-word learning state driving the Leitner review flow
-- and the whole-book progress display.
--
-- status = 'learning'  -> word was answered wrong; lives in the review book,
--                         moving through boxes 1-3 (box / next_due drive the
--                         daily due queue).
-- status = 'mastered'  -> answered correctly on first encounter, or graduated
--                         from box 3. Counts toward whole-book progress.
create table if not exists public.word_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  status text not null check (status in ('learning', 'mastered')),
  box integer not null default 1 check (box between 1 and 3),
  next_due date,
  wrong_count integer not null default 0 check (wrong_count >= 0),
  unit_id text,
  lesson_id text,
  first_seen_at timestamptz not null default now(),
  mastered_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, word)
);

alter table public.word_progress enable row level security;

create policy "Users can read their own word progress"
on public.word_progress for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own word progress"
on public.word_progress for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own word progress"
on public.word_progress for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own word progress"
on public.word_progress for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists word_progress_due_idx
on public.word_progress (user_id, status, next_due);

-- The notebook feature is removed; the review book replaces both the saved
-- words list and the standalone wrong-answer log.
drop table if exists public.saved_words;
drop table if exists public.quiz_wrong_answers;
