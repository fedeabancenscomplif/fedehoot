-- Enable RLS on all public tables.
-- Our server uses the service_role key which bypasses RLS,
-- so no policies are needed. This blocks any direct anon-key access.
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
