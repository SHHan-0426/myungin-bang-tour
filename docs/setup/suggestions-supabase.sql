-- 홈페이지 개선 제안 게시판 — Supabase 테이블 + RLS
-- (기존 Supabase 프로젝트에 추가해도 안전하도록 mb_ 접두사로 이름 격리)
-- 사용법: Supabase 대시보드 → 왼쪽 "SQL Editor" → New query → 아래 전체 붙여넣고 Run
-- (anon 키는 프론트에 노출돼도 안전. 실제 보호는 아래 RLS 정책이 담당.)

create table if not exists public.mb_suggestions (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  nickname    text,
  category    text,
  message     text not null check (char_length(message) between 1 and 500),
  status      text not null default '접수'
);

-- 최신순 조회 최적화
create index if not exists mb_suggestions_created_at_idx
  on public.mb_suggestions (created_at desc);

-- Row Level Security 켜기
alter table public.mb_suggestions enable row level security;

-- 누구나(anon) 읽기 허용
drop policy if exists "mb_suggestions read" on public.mb_suggestions;
create policy "mb_suggestions read"
  on public.mb_suggestions for select
  to anon
  using (true);

-- 누구나(anon) 등록 허용 — 단, 길이 제한 검증. 수정·삭제는 불가(운영자만 대시보드에서).
drop policy if exists "mb_suggestions insert" on public.mb_suggestions;
create policy "mb_suggestions insert"
  on public.mb_suggestions for insert
  to anon
  with check (
    char_length(message) between 1 and 500
    and (nickname is null or char_length(nickname) <= 20)
  );

-- 운영자 사용법:
--   status 값을 대시보드 Table editor에서 바꾸면 게시판 배지에 반영됩니다.
--   허용 값: 접수 · 검토중 · 반영 · 보류
--   부적절한 글은 대시보드에서 행 삭제(anon은 삭제 불가).
