-- Feedback: "write a letter to the little dinosaur". Kids (logged in or not)
-- pick a mood sticker and optionally leave a short message. The table is
-- write-only from the app; the owner reads entries in the Supabase dashboard.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  mood text not null check (mood in ('love', 'okay', 'hard', 'sad')),
  message text check (char_length(message) <= 200),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Anyone may send a letter; logged-in users may only attribute it to themselves.
create policy "Anyone can submit feedback"
on public.feedback for insert
to anon, authenticated
with check (user_id is null or (select auth.uid()) = user_id);

-- No select/update/delete policies: the app can only write, never read back.
