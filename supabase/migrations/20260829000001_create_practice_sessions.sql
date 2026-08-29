create table if not exists public.practice_sessions (
  id uuid primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  template_id text not null,
  template_name text not null,
  scenario_description text not null,
  scenario_context jsonb not null default '{}'::jsonb,
  status text not null check (status in ('active', 'completed', 'abandoned')),
  started_at timestamptz not null,
  ended_at timestamptz,
  events jsonb not null default '[]'::jsonb,
  review jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists practice_sessions_student_started_idx
  on public.practice_sessions (student_id, started_at desc);

create index if not exists practice_sessions_student_status_idx
  on public.practice_sessions (student_id, status);

alter table public.practice_sessions enable row level security;

-- The Express server uses the Supabase service key and performs ownership
-- checks before every session query. Do not expose this table to browser roles.
revoke all on table public.practice_sessions from anon, authenticated;
grant all on table public.practice_sessions to service_role;
