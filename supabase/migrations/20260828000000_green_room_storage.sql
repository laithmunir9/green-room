create table if not exists public.students (
  id uuid primary key,
  name text not null,
  email text not null unique,
  password_hash text,
  session_token text unique,
  created_at timestamptz not null default now(),
  usage jsonb not null default '{}'::jsonb,
  practice jsonb
);

alter table public.students enable row level security;

create index if not exists students_session_token_idx
  on public.students (session_token);

create index if not exists students_email_idx
  on public.students (lower(email));
