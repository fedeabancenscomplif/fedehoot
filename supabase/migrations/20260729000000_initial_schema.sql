create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  text text not null,
  time_limit integer not null default 20,
  type text not null default 'single',
  image_url text,
  order_index integer not null
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  text text not null,
  is_correct boolean not null default false,
  order_index integer not null
);

alter table public.quizzes disable row level security;
alter table public.questions disable row level security;
alter table public.answers disable row level security;
