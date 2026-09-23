#!/usr/bin/env node
/**
 * 다음 카페 자동 동기화 스크립트 (모바일 방식)
 *
 * GitHub Actions(cron)가 실행. m.cafe.daum.net 게시판을 순회하며
 * 페이지에 주입된 window.articles + 목록의 작성일을 읽어
 * 새 게시물만 data/*.json에 추가.
 *
 * 특징
 *  - 모바일 페이지(window.articles) 기반 — 로그인 없이 공개 게시판 목록 수집
 *  - 정치·선거·시사 글 자동 제외 (능파 방침) — POLITICS 블록리스트
 *  - 작성일(posted) 저장 — 대문 게시판/정렬에 사용
 *  - 새 글만 추가; 기존 데이터·순서 보존 (배열 앞에 unshift)
 *
 * 처리 게시판
 *  여행 가는날(1fXs)·해외문화탐방(RfFv)·일본여행(S2Ss) → past-travels.json
 *  여행후기(4b2T) → reviews.json
 *  인문학(RfFr)·편지(1fY7)·음악(S2Se)·산책(Gz1K) → stories.json
 *  명인추천(RrBS)·맛집(1fXL)·칼국수로드(S6Ar) → places.json
 *
 * 한계(수동 큐레이션이 보완하는 부분)
 *  - 제목은 원문 그대로(가벼운 정리만). featured/히어로용 제목 다듬기는 수동.
 *  - 대표 이미지는 수집 안 함(글 하나하나 방문이 필요·느림). 이미지는 수동.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

const BOARDS = {
  past: [
    { bid: '1fXs', name: '여행 가는날 (행복파도타기)' },
    { bid: 'RfFv', name: '해외문화탐방!!' },
    { bid: 'S2Ss', name: '일본 여행 !!' },
    { bid: 'S7cl', name: '명인방과 함께' },
  ],
  reviews: [
    { bid: '4b2T', name: '여행후기' },
  ],
  stories: [
    { bid: 'RfFr', name: '길위의 인문학', key: 'humanities' },
    { bid: '1fY7', name: '여행! 편지!!', key: 'letters' },
    { bid: 'S2Se', name: '음악 동영상', key: 'music' },
    { bid: 'Gz1K', name: '산책!!', key: 'walks' },
    { bid: 'RAah', name: '숲으로간 미술관', key: 'artmuseum' },
    { bid: '1YGQ', name: '임상수(능파)', key: 'nampa', travelOnly: true },
  ],
  places: [
    { bid: 'RrBS', name: '명인 추천 명인,명소', key: 'recommended' },
    { bid: '1fXL', name: '명품 맛집!', key: 'restaurants' },
    { bid: 'S6Ar', name: '2026 칼국수로드', key: 'kalguksu' },
  ],
};

// 여행 관련 여부(제목 기준) — travelOnly 게시판(예: 임상수(능파))에서 여행 글만 수집
const TRAVEL = /(여행|기행|투어|답사|순례|둘레길|트레킹|나들이|여정|당일|\d\s*박|국내|해외|섬|바다|산행|산행기|축제|명소|기차|공항|여행기|가는날|캠프|캠핑|일본|유럽|중국|대만|베트남|제주|경주|강원|전라|경상|충청|서울|부산|안동|여수|순천|군산)/;
function isTravel(title) { return TRAVEL.test(title || ''); }

// 한줄메모(능파의 한마디)용 — 정치+시사 확장 필터. 공개 대문에 올라가므로 넓게 배제.
const CURRENT_AFFAIRS = /(기자회견|대통령|장관|정부|여당|야당|국회|의원|선거|정권|정치|정책|청문회|특검|검찰|재판|판결|구속|기소|시위|집회|파업|규탄|성명|논평|여론|지지율|좌파|우파|보수|진보|여의도|남북|한미|외교안보|국방|계엄)/;
function isSensitive(t) { return isPolitical(t) || CURRENT_AFFAIRS.test(t || ''); }

// 한줄메모장(_memo 위젯) 수집 — 인용/한 줄. window.articles가 없어 DOM에서 파싱.
async function scrapeMemo(page) {
  await page.goto('https://m.cafe.daum.net/redtraintour/_memo?boardType=C', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(1500);
  return await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('ul li').forEach(li => {
      const raw = (li.innerText || '').replace(/\s+/g, ' ').trim();
      if (!/작성자/.test(raw)) return;
      const dm = raw.match(/작성시간\s*(\d\d)\.(\d\d)\.(\d\d)/);
      const body = raw.split('작성자')[0].trim();
      if (body.length < 10) return;
      out.push({ text: body, date: dm ? `20${dm[1]}-${dm[2]}-${dm[3]}` : '' });
    });
    return out; // 최신이 위
  });
}

async function syncMemos(page) {
  const file = loadJson('memos.json');
  const memos = await scrapeMemo(page);
  const clean = [];
  for (const m of memos) {
    if (isSensitive(m.text)) { skipped++; console.log(`  ⊘ 시사 제외(메모): ${m.text.slice(0,30)}`); continue; }
    if (m.text.length > 230) { console.log(`  ⊘ 길이 제외(메모): ${m.text.slice(0,30)}…`); continue; }
    clean.push(m);
  }
  file.posts = clean.slice(0, 20); // 최신 클린 메모만 유지
  file.lastSync = nowKST();
  saveJson('memos.json', file);
  console.log(`✓ memos.json — ${file.posts.length}건(클린)`);
  return 0;
}

/**
 * 정치·선거·시사 제외 키워드.
 * 여행 글 오탐을 피하려 '대통령'·'교육감' 같은 여행 문맥에도 쓰이는 단어는 제외하고
 * (예: "대통령 별장 봄꽃"=청남대 여행), 선거·정치 고유 용어만 담음.
 */
const POLITICS = /(선거|투표|개표|공천|보궐|지지율|여당|야당|대선|총선|지방선거|당대표|출마|낙선|탄핵|국회의원|정치권|여의도|시위|집회|참정권|대법원장|정권|국민의힘|민주당|더불어민주당|개혁신당|조국혁신당|진보당|이재명|윤석열|문재인|박근혜|이명박|한동훈|이준석|김건희|추미애|홍준표|안철수|심상정|나경원|오세훈|김문수|트럼프|바이든|시진핑|김정은|푸틴)/;
function isPolitical(title) { return POLITICS.test(title || ''); }

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
}
function saveJson(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2) + '\n', 'utf8');
}
function nowKST() {
  // Asia/Seoul 기준 ISO 근사 (워크플로에서 TZ=Asia/Seoul 설정)
  const d = new Date();
  const kst = new Date(d.getTime() + (9 * 60 - (-d.getTimezoneOffset())) * 60000);
  return kst.toISOString().replace(/\.\d+Z$/, '+09:00');
}
function decode(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&#34;|&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

// 모바일 게시판 한 페이지에서 글 목록(pid/title/작성일/조회/댓글) 추출
async function scrapeBoard(page, bid) {
  const url = `https://m.cafe.daum.net/redtraintour/${bid}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(1800);

  const data = await page.evaluate(() => {
    const arts = (window.articles || []).map(a => ({
      pid: String(a.dataid),
      title: a.title || '',
      views: a.viewCount || 0,
      comments: a.commentCount || 0,
      // 본문 대표 사진(목록 공개 썸네일) → 카드 이미지용. 작은 C52x52를 큰 사이즈로 치환.
      image: a.thumbnailImageUrl ? a.thumbnailImageUrl.replace('/thumb/C52x52/', '/thumb/R500x0/') : null,
    }));
    // 목록 행 텍스트(공지 제외) — 작성일 추출용. window.articles와 순서가 대체로 일치.
    const rows = [...document.querySelectorAll('.list_cafe>li')]
      .map(li => (li.innerText || '').replace(/\s+/g, ' ').trim())
      .filter(t => t && !/^공지/.test(t));
    return { arts, rows };
  });

  const today = new Date().toISOString().slice(0, 10);
  return data.arts.map((a, i) => {
    const row = data.rows[i] || '';
    const m = row.match(/(\d{2})\.(\d{2})\.(\d{2})/);
    let posted = null;
    if (m) posted = `20${m[1]}-${m[2]}-${m[3]}`;
    else if (/작성시간\s*\d{1,2}:\d{2}|(^|\s)new(\s|$)/.test(row)) posted = today; // 오늘 글은 시간만 표기
    return { pid: a.pid, title: decode(a.title), views: a.views, comments: a.comments, posted, image: a.image };
  });
}

// 제목/작성일에서 연도·계절·지역 추출 (past-travels용)
function extractYear(title, posted) {
  const m = title.match(/(\b20\d{2}\b)/);
  if (m) return parseInt(m[1]);
  if (posted) return parseInt(posted.slice(0, 4));
  return new Date().getFullYear();
}
function extractSeason(title) {
  const m = title.match(/(\d{1,2})\s*월/);
  if (!m) return '봄';
  const mo = parseInt(m[1]);
  if (mo >= 3 && mo <= 5) return '봄';
  if (mo >= 6 && mo <= 8) return '여름';
  if (mo >= 9 && mo <= 11) return '가을';
  return '겨울';
}
function extractRegion(title, bid) {
  if (bid === 'RfFv' || bid === 'S2Ss') return '해외';
  const t = title;
  const map = [
    ['제주', '제주'], ['우도', '제주'], ['서귀포', '제주'], ['한라산', '제주'],
    ['정선', '강원'], ['평창', '강원'], ['강릉', '강원'], ['동해', '강원'], ['속초', '강원'],
    ['양양', '강원'], ['인제', '강원'], ['운탄', '강원'], ['태백', '강원'], ['철원', '강원'],
    ['한탄강', '강원'], ['포천', '강원'], ['횡성', '강원'], ['영월', '강원'], ['봉평', '강원'],
    ['대관령', '강원'], ['박수근', '강원'], ['두타연', '강원'],
    ['경주', '경상'], ['안동', '경상'], ['부산', '경상'], ['울산', '경상'], ['대구', '경상'],
    ['통영', '경상'], ['거제', '경상'], ['청송', '경상'], ['문경', '경상'], ['포항', '경상'],
    ['영덕', '경상'], ['울진', '경상'], ['영양', '경상'], ['함양', '경상'], ['진주', '경상'],
    ['합천', '경상'], ['황매산', '경상'], ['남해', '경상'], ['하동', '경상'], ['해인사', '경상'],
    ['광주', '전라'], ['강진', '전라'], ['해남', '전라'], ['목포', '전라'], ['남원', '전라'],
    ['군산', '전라'], ['익산', '전라'], ['전주', '전라'], ['영암', '전라'], ['나주', '전라'],
    ['송광사', '전라'], ['변산', '전라'], ['내소사', '전라'], ['마이산', '전라'], ['보령', '전라'],
    ['대전', '충청'], ['청주', '충청'], ['공주', '충청'], ['부여', '충청'], ['청양', '충청'],
    ['보은', '충청'], ['충주', '충청'], ['서산', '충청'], ['예산', '충청'], ['금산', '충청'],
    ['단양', '충청'], ['추사', '충청'], ['신두리', '충청'], ['사유원', '경상'],
    ['서울', '수도권'], ['성북', '수도권'], ['북촌', '수도권'], ['프라움', '수도권'],
  ];
  for (const [kw, reg] of map) if (t.includes(kw)) return reg;
  return '전국';
}

let skipped = 0; // 정치 제외 카운트

async function syncPastTravels(page) {
  const file = loadJson('past-travels.json');
  const existing = new Set(file.posts.map(p => `${p.bid}/${p.pid}`));
  let added = 0;
  for (const board of BOARDS.past) {
    console.log(`[past] ${board.name} (${board.bid})…`);
    const posts = await scrapeBoard(page, board.bid);
    // 기존 글이라도 대표 사진이 비어 있으면 목록 썸네일로 채움(1회성 백필)
    const byPid = new Map(posts.map(p => [String(p.pid), p]));
    file.posts.forEach(p => {
      if (String(p.bid) === String(board.bid) && !p.image) {
        const src = byPid.get(String(p.pid));
        if (src && src.image) p.image = src.image;
      }
    });
    // 카페는 최신이 위 → 오래된 것부터 unshift 해야 최종 순서가 최신-우선 유지
    for (const post of [...posts].reverse()) {
      const key = `${board.bid}/${post.pid}`;
      if (existing.has(key)) continue;
      if (isPolitical(post.title)) { skipped++; console.log(`  ⊘ 정치 제외 ${post.pid}: ${post.title.slice(0,40)}`); continue; }
      const region = extractRegion(post.title, board.bid);
      file.posts.unshift({
        bid: board.bid, pid: post.pid, title: post.title,
        year: extractYear(post.title, post.posted),
        season: extractSeason(post.title),
        region,
        ...(region === '해외' ? { country: '해외' } : {}),
        posted: post.posted,
        views: post.views, comments: post.comments,
        ...(post.image ? { image: post.image } : {}),
      });
      existing.add(key); added++;
      console.log(`  ✚ ${post.pid}: ${post.title.slice(0, 50)}`);
    }
  }
  file.lastSync = nowKST();
  saveJson('past-travels.json', file);
  console.log(`✓ past-travels.json — ${added}건 추가, 총 ${file.posts.length}건`);
  return added;
}

async function syncReviews(page) {
  const file = loadJson('reviews.json');
  const existing = new Set(file.posts.map(p => String(p.pid)));
  let added = 0;
  for (const board of BOARDS.reviews) {
    console.log(`[reviews] ${board.name}…`);
    const posts = await scrapeBoard(page, board.bid);
    for (const post of [...posts].reverse()) {
      if (existing.has(post.pid)) continue;
      if (isPolitical(post.title)) { skipped++; console.log(`  ⊘ 정치 제외 ${post.pid}`); continue; }
      file.posts.unshift({
        pid: post.pid, title: post.title, trip: '기타',
        year: extractYear(post.title, post.posted), keywords: '', posted: post.posted,
      });
      existing.add(post.pid); added++;
      console.log(`  ✚ ${post.pid}: ${post.title.slice(0, 50)}`);
    }
  }
  file.lastSync = nowKST();
  saveJson('reviews.json', file);
  console.log(`✓ reviews.json — ${added}건 추가`);
  return added;
}

async function syncSectioned(page, fileName, boards) {
  const file = loadJson(fileName);
  let added = 0;
  for (const board of boards) {
    const section = file.sections[board.key];
    if (!section) continue;
    const existing = new Set(section.posts.map(p => String(p.pid)));
    console.log(`[${fileName}/${board.key}] ${board.name}…`);
    const posts = await scrapeBoard(page, board.bid);
    for (const post of [...posts].reverse()) {
      if (existing.has(post.pid)) continue;
      if (isPolitical(post.title)) { skipped++; console.log(`  ⊘ 정치 제외 ${post.pid}: ${post.title.slice(0,40)}`); continue; }
      if (board.travelOnly && !isTravel(post.title)) { console.log(`  ⊘ 비여행 제외 ${post.pid}: ${post.title.slice(0,40)}`); continue; }
      const entry = { pid: post.pid, title: post.title, posted: post.posted };
      if (fileName === 'places.json') entry.tag = '';
      section.posts.unshift(entry);
      existing.add(post.pid); added++;
      console.log(`  ✚ ${post.pid}: ${post.title.slice(0, 50)}`);
    }
  }
  file.lastSync = nowKST();
  saveJson(fileName, file);
  console.log(`✓ ${fileName} — ${added}건 추가`);
  return added;
}

(async () => {
  console.log('🔄 다음 카페 동기화 시작:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    locale: 'ko-KR',
  });
  const page = await context.newPage();

  let total = 0;
  try {
    total += await syncPastTravels(page);
    total += await syncReviews(page);
    total += await syncSectioned(page, 'stories.json', BOARDS.stories);
    total += await syncSectioned(page, 'places.json', BOARDS.places);
    await syncMemos(page);
  } catch (err) {
    console.error('❌ 스크래핑 오류:', err.message);
  } finally {
    await browser.close();
  }
  console.log(`\n✅ 동기화 완료 — 신규 ${total}건 추가, 정치 제외 ${skipped}건`);
})();
