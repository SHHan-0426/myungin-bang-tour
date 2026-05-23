# 운영자 가이드 — 능파님이 직접 갱신하는 방법

> 한 줄 원칙: **변경은 GitHub `main` 브랜치에 push만 하면 1-2분 내 사이트 자동 반영**

작성 2026.05.23 · 사이트 v0.4

---

## 0. 살아 있는 흐름 한 장 요약

```
운영자 능파
   │
   │ 1. data/*.json 편집 (또는 사진 추가)
   ▼
GitHub main 브랜치 push
   │
   │ 2. Netlify 자동 감지 (몇 초)
   ▼
사이트 자동 빌드 + 라이브 반영 (1-2분)
   │
   ▼
회원 자동 알림 (Phase 2 이후, 카톡 채널 / 이메일)
```

---

## 1. 새 여행 일정 추가

가장 자주 하는 작업.

### 1-1. data/tours.json 열기

`data/tours.json` 파일에 새 항목 1개 추가:

```json
{
  "id": "안동-2026-09",
  "title": "안동 도산서원 — 퇴계의 새벽",
  "subtitle": "한밤 강연과 새벽 산책",
  "category": "정기",
  "domestic": true,
  "region": "경상",
  "board": "여행 가는날 (행복파도타기)",
  "startDate": "2026-09-15",
  "endDate": "2026-09-16",
  "duration": "1박 2일",
  "host": "능파 임상수",
  "image": "./assets/andong-2026-09.jpg",
  "cafeUrl": "https://cafe.daum.net/redtraintour/1fXs/XXXX"
}
```

### 1-2. 필수 필드
- `id` — 영문 슬러그 (영문-숫자, 다른 항목과 중복 금지)
- `startDate`, `endDate` — **YYYY-MM-DD** 형식 필수
- `title`, `subtitle` — 제목 한 줄, 부제 한 줄
- `domestic` — `true` (국내) / `false` (해외)
- `image` — 사진 경로 (`./assets/파일명.jpg`)
- `cafeUrl` — 다음 카페 원문 URL

### 1-3. 자동 반영되는 곳
- 🏠 홈의 **자동 히어로** (오늘 이후 가장 가까운 일정이 자동 선택됨)
- 🏠 홈의 **다음 여행 일정** 카드 3장 (시간순)
- 🚆 여행 페이지 **다가오는 여행** 리스트
- 🚆 여행 페이지 **다가오는 국내/해외 자동 분류** (`domestic` 기준)
- 📋 여행 상세 페이지 (`?id=` 로 분기)
- 👤 마이 페이지 **통합 검색**

---

## 2. 새 사진 추가/교체

### 2-1. 사진 준비
- **JPG**, 가로형 권장 (히어로용은 4:5 세로도 OK)
- 크기: 800×600 이상, 너무 크면 1500px 정도로 리사이즈
- 파일명: 영문/숫자/하이픈만 (한글·공백 금지)
  - 예: `jeju-suguk.jpg`, `coastal-7.jpg`

### 2-2. 사진 넣기
1. `assets/` 폴더에 파일 복사
2. `data/tours.json` 에서 해당 항목의 `image` 필드를 `./assets/새파일명.jpg` 로 변경
3. 저장 → push

### 2-3. macOS 사진 리사이즈 (터미널)
```bash
cd ~/Desktop/myungin-bang-mockup/assets
sips -Z 1500 -s format jpeg -s formatOptions 85 input.png --out output.jpg
```

---

## 3. 지난 여행 박물관 갱신 (매주 일요일 22시 권장)

`data/past-travels.json` 에 다음 카페 게시물을 추가하면 박물관에 자동으로 들어갑니다.

### 3-1. 매뉴얼 추가 (작은 양)
한 항목 추가 예시:
```json
{
  "pid": "1065",
  "title": "12월 5(금) — 강릉 안목해변 겨울바다",
  "year": 2026,
  "season": "겨울",
  "region": "강원",
  "posted": "2026-09-15",
  "views": 0,
  "comments": 0
}
```

### 3-2. 자동 수집 (Phase 2 본격 시작 후)
Claude가 매주 일요일 22시에 다음 카페 신규 글을 자동 스캔해 `past-travels.json` 을 갱신합니다.

운영자는:
1. 카톡으로 "지난주 카페 새 글 정리해줘" 요청
2. Claude가 자동 push
3. 끝

### 3-3. 박물관 필터 카테고리
현재 지원하는 분류:
- **시간별** — 2026 / 2025 / 2024 / 2023 ... (연도)
- **지역별** — 제주 / 강원 / 경상 / 전라 / 충청 / 수도권 / 해외
- **계절별** — 봄 / 여름 / 가을 / 겨울

새 분류를 추가하려면 `tour.html` JS의 `renderFilterChips` 함수 안에 옵션 1개 추가.

---

## 4. 명인소 추가

`place.html` 안에 직접 카드를 추가하면 즉시 반영. 추후 `data/places.json` 으로 분리 예정.

각 명인소:
- `이름`, `지역`, `분류` (음식/공간/자연/예술)
- `사진` (`./assets/place-XX.jpg`)
- `위·경도` (지도 핀 표시용)
- `cafeUrl` (원문)

---

## 5. 이야기 / 매거진 글 추가

`story.html` 안에 직접 추가하거나 `data/stories.json` 으로 분리 예정 (Phase 2).

각 글:
- `제목`, `카테고리` (인문학/편지/한줄/음악)
- `표지 사진`
- `cafeUrl` (원문)

---

## 6. 배포 흐름 (자동)

### 6-1. 자동 배포 (권장)
GitHub `main` 브랜치에 push 하면 Netlify가 자동 빌드:

```bash
# 능파님의 PC에서 (또는 Claude에게 부탁)
cd ~/Desktop/myungin-bang-mockup
git add .
git commit -m "10월 안동 일정 추가"
git push origin main
```

1-2분 후 <https://myungin-bang-tour.netlify.app> 에 반영.

### 6-2. 수동 미리 배포 (긴급)
```bash
cd ~/Desktop/myungin-bang-mockup
netlify deploy --prod --dir=.
```

### 6-3. 상태 확인
- 빌드 로그: <https://app.netlify.com/projects/myungin-bang-tour/deploys>
- GitHub commits: <https://github.com/SHHan-0426/myungin-bang-tour/commits/main>

---

## 7. 잘못된 push 되돌리기

```bash
# 마지막 커밋 취소 (push 전)
git reset HEAD~1

# 이미 push 한 경우 — 위험! 능파님께 먼저 확인 받기
git revert HEAD
git push origin main
```

긴급 시: Claude에게 "방금 한 변경 되돌려줘" 요청.

---

## 8. 자주 쓰는 작업

| 작업 | 어디서 | 어떻게 |
|---|---|---|
| 새 여행 일정 | `data/tours.json` | 항목 1개 추가 |
| 히어로 자동/수동 토글 | `index.html` 의 `const AUTO_HERO = true;` | `false` 로 바꾸면 수동 |
| 카톡 채널 URL 교체 | 전 페이지의 `<a class="kakao-cta" href="...">` | 6곳 모두 같은 URL로 |
| 사진 한 장 교체 | `assets/` | 같은 파일명으로 덮어쓰기 |
| 박물관 새 글 | `data/past-travels.json` | 항목 추가 |
| 카페 게시판 우선순위 변경 | `PLAN.md` Phase 2 표 | 텍스트 편집 |

---

## 9. 비밀번호·계좌 절대 금기

사이트는 외부 공개이므로 절대 노출 금지:

- ❌ 두두협동조합 계좌번호 (`1005-104-XXXXXX`)
- ❌ 능파님 휴대전화 (`010-XXXX-XXXX`)
- ❌ 줌 회의 ID·암호
- ❌ 회원 개인 연락처
- ❌ 결제 정보 / 카드 번호

문의 채널은 **카카오톡 채널**로만 통합.

---

## 10. 능파님이 자주 묻는 것

### "내 사진을 어떻게 보내야 하나요?"
1. 카톡으로 Claude에게 사진 전송 (한 번에 10장까지)
2. "tour-01.jpg 자리에 넣어줘" 같이 요청
3. Claude가 적절한 곳에 배치 후 push

### "도메인 연결은 언제?"
[`PLAN.md`](./PLAN.md) **Phase 1** 참고. 능파님이 다음을 결정하시면 시작:
1. 도메인 이름 (`myunginbang.com` / `myunginbangtour.kr` / `redtraintour.com`)
2. 도메인 등록 (카페24·가비아 등 연 2만원)

도메인 연결 후 사이트 코드의 절대 URL 4곳만 자동 갱신됩니다.

### "비용은?"
- **호스팅**: Netlify 무료 티어 (월 100GB 트래픽, 충분)
- **도메인**: 연 2만원 (도메인 회사에 따라)
- **카카오 비즈채널**: 가입 무료, 메시지 발송 시 건당 ~10원
- **결제 PG**: 카카오페이 / 토스 — 무료 가입, 결제 수수료만 (3-4%)

---

## 11. 도와줄 사람

| 역할 | 누가 | 어떻게 연락 |
|---|---|---|
| 사이트 운영 / Claude 협업 | 능파 + Claude | Claude 채팅창 |
| 사진·웹자보 | 김태영 (씽크스마트) | 카톡 |
| 카페·운영 안건 | 이귀보 (두두협동조합) | 카톡 |
| 회의록·자료 | 정건화 교수 | 메일 |

---

**문서 버전**: v1.0 (2026.05.23)  
**다음 갱신**: Phase 1 도메인 연결 시점
