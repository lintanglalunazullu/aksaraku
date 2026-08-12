-- Supabase SQL untuk menyimpan riwayat chat Aksaraku
-- Jalankan di Supabase SQL editor.

-- Pastikan extension pgcrypto tersedia (Supabase biasanya sudah menyediakannya).
-- Jika belum, jalankan: CREATE EXTENSION IF NOT EXISTS "pgcrypto";

create table if not exists public.chat_sessions (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'Sesi chat baru',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid not null primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  inserted_at timestamptz not null default now()
);

create index if not exists idx_chat_sessions_user_id on public.chat_sessions (user_id);
create index if not exists idx_chat_sessions_updated_at on public.chat_sessions (user_id, updated_at desc);
create index if not exists idx_chat_messages_session_id on public.chat_messages (session_id, inserted_at asc);

-- Trigger untuk memperbarui updated_at pada perubahan baris chat_sessions
create function public.update_chat_sessions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_update_chat_sessions_updated_at
before update on public.chat_sessions
for each row execute function public.update_chat_sessions_updated_at();
