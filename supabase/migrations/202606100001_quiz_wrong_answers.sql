create table if not exists public.quiz_wrong_answers (
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  unit_id text not null,
  lesson_id text not null,
  wrong_count integer not null default 1 check (wrong_count >= 1),
  last_wrong_at timestamptz not null default now(),
  primary key (user_id, word)
);

alter table public.quiz_wrong_answers enable row level security;

create policy "Users can read their own wrong answers"
on public.quiz_wrong_answers for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own wrong answers"
on public.quiz_wrong_answers for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own wrong answers"
on public.quiz_wrong_answers for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own wrong answers"
on public.quiz_wrong_answers for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists quiz_wrong_answers_user_last_wrong_idx
on public.quiz_wrong_answers (user_id, last_wrong_at desc);
