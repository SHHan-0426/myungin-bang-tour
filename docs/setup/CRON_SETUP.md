# 다음 카페 자동 동기화 설정 — 능파님이 한 번만 하실 작업

매주 일요일 22시 KST에 다음 카페 11개 게시판을 자동으로 스크래핑해 사이트 데이터를 갱신하는 GitHub Actions 워크플로우입니다. (정치·선거 글 자동 제외 · 작성일까지 저장 → 대문 게시판에 반영. 나중에 매일로 전환 가능)

## 가장 쉬운 경로 — 워크플로 파일이 이미 저장소에 있으면

`.github/workflows/sync-cafe.yml` 이 저장소에 포함돼 있으면 **붙여넣기 없이** 아래만 하면 끝입니다:

1. <https://github.com/SHHan-0426/myungin-bang-tour> → **Settings → Actions → General**
2. 맨 아래 **Workflow permissions** → **"Read and write permissions"** 선택 → **Save**
3. **Actions** 탭 → 좌측 "다음 카페 자동 동기화" → 우측 **Run workflow**로 즉시 테스트

이후 매일 22시 자동 실행됩니다. 아래 "직접 등록"은 파일이 저장소에 없을 때만 필요합니다.

## (파일이 없을 때만) 직접 등록 — 3분 소요

GitHub 보안 정책상 일부 토큰·OAuth 앱은 워크플로 파일을 자동 생성하지 못합니다. 그럴 땐 아래처럼 한 번만 등록하면 영구 동작.

### 1단계: GitHub 저장소 열기
브라우저에서 <https://github.com/SHHan-0426/myungin-bang-tour> 접속.

### 2단계: Actions 탭 → New workflow
1. 상단 메뉴의 **Actions** 탭 클릭
2. **"set up a workflow yourself"** 클릭

### 3단계: 파일 이름 변경
좌상단의 `main.yml` 입력칸을 `sync-cafe.yml` 로 변경 (경로는 `.github/workflows/sync-cafe.yml` 자동)

### 4단계: 내용 붙여넣기
현재 저장소 안에 있는 [`docs/setup/sync-cafe.yml.txt`](./sync-cafe.yml.txt) 파일 내용을 통째로 복사해서 붙여넣기.

### 5단계: 커밋
페이지 우측 상단 녹색 **"Commit changes…"** 버튼 → **"Commit changes"**

### 6단계: 확인
1. **Actions** 탭으로 돌아가면 워크플로우가 등록되어 있음
2. 좌측에 **"다음 카페 자동 동기화"** 보임
3. 우측 **"Run workflow"** 버튼으로 즉시 테스트 실행 가능 (드라이런)

## 자동 실행 일정

- **매주 일요일 22:00 KST** 자동 실행 (cron: `0 13 * * 0` UTC) — 매일로 바꾸려면 `0 13 * * *`
- 새 게시물이 있으면 자동으로 `data/*.json` 갱신 + commit + push
- Netlify가 받아서 1~2분 내 자동 배포

## 수동 실행 (필요 시)

긴급하게 동기화하고 싶을 때:
1. GitHub → Actions → "다음 카페 자동 동기화"
2. 우측 **"Run workflow"** → "Run workflow" 버튼
3. 약 1~2분 후 완료

## 실행 결과 확인

각 실행 클릭 → 로그 확인:
```
🔄 다음 카페 동기화 시작
[past] 여행 가는날 (1fXs) 스크래핑…
  ✚ 1064: (새 글 제목)
[reviews] 여행후기 스크래핑…
...
✅ 동기화 완료 — 총 N건 신규 추가
```

## 문제가 생기면

- **Actions 실행 실패**: Daum 카페 구조가 바뀌었을 수 있음 → Claude 호출
- **스크래핑은 됐는데 변경 없음**: 새 글이 없는 주 (정상)
- **푸시 실패**: GitHub 권한 문제 → 저장소 Settings → Actions → "Read and write permissions" 활성화 확인
