-- 밥차 관심·참여 신청 — Supabase 테이블 + RLS
-- (개인정보 포함이라 '익명 등록만' 허용, 조회는 운영자 대시보드에서만)
-- 사용법: Supabase 대시보드 → SQL Editor → 붙여넣고 Run

create table if not exists public.mb_bapcha_signups (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  nickname    text,
  contact     text,
  interest    text,
  message     text check (char_length(message) <= 500),
  status      text not null default '접수'
);

alter table public.mb_bapcha_signups enable row level security;

-- 누구나(anon) 등록만 허용 — 길이 제한 검증
drop policy if exists "mb_bapcha insert" on public.mb_bapcha_signups;
create policy "mb_bapcha insert"
  on public.mb_bapcha_signups for insert
  to anon
  with check (
    char_length(coalesce(message,'')) <= 500
    and char_length(coalesce(nickname,'')) <= 20
    and char_length(coalesce(contact,'')) <= 60
  );

-- ⚠️ SELECT 정책을 두지 않음 → 익명은 신청 내역을 조회할 수 없음.
--    신청 정보(연락처 포함)는 운영자만 Supabase 대시보드에서 열람.
