# 명인방투어 (Myungin Bang Tour)

> 능파의 길 위 인문학 · 모바일 우선 v0.3 시안

다음 카페 (`cafe.daum.net/redtraintour`)에서 독립 플랫폼으로의 단계적 이전을 위한 모바일 우선 사이트.

## 빠른 시작

```bash
# 로컬에서 보기 — Python 3
python3 -m http.server 8000
# → http://localhost:8000

# 또는 그냥 index.html을 브라우저에서 열기
```

## 구조

```
.
├── index.html          🏠 홈 (자동 히어로 + 큐레이션)
├── tour.html           🚆 여행 (전체 일정)
├── tour-detail.html    📋 여행 상세 (?id= 로 분기)
├── story.html          📖 이야기 (매거진)
├── place.html          📍 명인소 (Leaflet 지도 연동)
├── my.html             👤 마이 (검색 + 로그인 목업)
├── shared.css          공통 스타일
├── data/
│   └── tours.json      여행 일정 데이터 (자동 히어로 소스)
└── assets/             사진 11장
```

## 주요 기능

- **자동 히어로** — `data/tours.json` 한 파일만 편집하면 가장 가까운 여행 일정으로 자동 갱신 (`AUTO_HERO` 토글)
- **실제 지도** — Leaflet + OpenStreetMap, 4개 명인소 마커 (Kakao Maps 전환 주석 포함)
- **통합 검색** — 11개 콘텐츠 인덱스 즉시 필터링
- **로그인 목업** — localStorage 기반, 신청한 여행 노출

## 배포

자동: GitHub `main` 브랜치에 push → Netlify 자동 빌드 → 라이브 반영 (1-2분).

## 운영자 가이드

새 여행 일정 추가:
1. `data/tours.json` 열기
2. 항목 1개 추가 (필수: `startDate`, `title`, `image`, `cafeUrl`)
3. 저장 → push
4. 히어로·다음 여행 카드 자동 갱신

자세한 로드맵은 [`PLAN.md`](./PLAN.md) 참고.

---

**브랜드**: 명인방투어 · 능파 임상수 · since 2009  
**다음 카페 원본**: <https://cafe.daum.net/redtraintour>
