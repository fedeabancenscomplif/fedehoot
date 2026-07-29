alter table public.quizzes
  add column user_id uuid references auth.users(id) on delete set null;

create index quizzes_user_id_idx on public.quizzes(user_id);
