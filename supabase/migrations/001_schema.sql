-- Renew Aleart — Supabase schema
-- รันใน Supabase Dashboard → SQL Editor (หรือ supabase db push)

create extension if not exists pgcrypto;

-- ─── Tables ───────────────────────────────────────────────────────────────

create table if not exists public.app_users (
  id bigint primary key,
  username text not null unique,
  password_hash text not null,
  display_name text not null default '',
  role text not null default 'user' check (role in ('admin', 'user')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token text primary key,
  user_id bigint not null references public.app_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_expires_at_idx on public.sessions(expires_at);

create table if not exists public.departments (
  id bigint primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id bigint primary key,
  name text not null,
  department text not null default '',
  emails jsonb not null default '[]'::jsonb,
  drive_url text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.licenses (
  id bigint primary key,
  project_id bigint not null references public.projects(id) on delete cascade,
  name text not null,
  issue_date date,
  expiry_date date,
  alert_months int not null default 3,
  drive_url text not null default '',
  status text not null default '-',
  steps jsonb not null default '[]'::jsonb,
  renewal_cycles jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists licenses_project_id_idx on public.licenses(project_id);

create table if not exists public.license_history (
  id bigint primary key,
  license_id bigint not null references public.licenses(id) on delete cascade,
  entry_date date not null default current_date,
  action text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists license_history_license_id_idx on public.license_history(license_id);

-- ─── RLS: ปิดการเข้าถึงตารงจาก anon — ใช้ RPC เท่านั้น ─────────────────────

alter table public.app_users enable row level security;
alter table public.sessions enable row level security;
alter table public.departments enable row level security;
alter table public.projects enable row level security;
alter table public.licenses enable row level security;
alter table public.license_history enable row level security;

-- ─── Seed แผนก + admin (รหัสเริ่มต้น 1234) ───────────────────────────────

insert into public.departments (id, name) values
  (1778933065631, 'ก่อสร้างและวิศวกรรม'),
  (1778933066553, 'นิติบุคคลอาคารชุด'),
  (1778933067876, 'บริหารทรัพยากรอาคาร'),
  (1778933068772, 'ส่วนกลาง (HQ)'),
  (1778933069830, 'อื่นๆ')
on conflict (id) do nothing;

insert into public.app_users (id, username, password_hash, display_name, role, active)
values (
  1,
  'admin',
  crypt('1234', gen_salt('bf')),
  'ผู้ดูแลระบบ',
  'admin',
  true
)
on conflict (username) do nothing;
