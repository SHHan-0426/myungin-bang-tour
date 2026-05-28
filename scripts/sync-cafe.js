#!/usr/bin/env node
/**
 * 다음 카페 자동 동기화 스크립트
 *
 * 매주 일요일 22:00 KST에 GitHub Actions가 실행.
 * Playwright + Chromium으로 카페 게시판들을 순회하며
 * 새 게시물 메타를 추출해 data/*.json 갱신.
 *
 * 처리하는 게시판:
 *  - 여행 가는날 (1fXs) → past-travels.json
 *  - 해외문화탐방 (RfFv) → past-travels.json
 *  - 일본 여행 (S2Ss) → past-travels.json
 *  - 여행후기 (4b2T) → reviews.json
 *  - 길위의 인문학 (RfFr) → stories.json
 *  - 여행! 편지! (1fY7) → stories.json
 *  - 음악 동영상 (S2Se) → stories.json
 *  - 산책 (Gz1K) → stories.json
 *  - 명인 추천 (RrBS) → places.json
 *  - 명품 맛집 (1fXL) → places.json
 *  - 칼국수로드 (S6Ar) → places.json
 *
 * 새 게시물만 추가; 기존 데이터는 보존.
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
  ],
  reviews: [
    { bid: '4b2T', name: '여행후기' },
  ],
  stories: [
    { bid: 'RfFr', name: '길위의 인문학', key: 'humanities' },
    { bid: '1fY7', name: '여행! 편지!!', key: 'letters' },
    { bid: 'S2Se', name: '음악 동영상', key: 'music' },
    { bid: 'Gz1K', name: '산책!!', key: 'walks' },
  ],
  places: [
    { bid: 'RrBS', name: '명인 추천 명인,명소', key: 'recommended' },
    { bid: '1fXL', name: '명품 맛집!', key: 'restaurants' },
    { bid: 'S6Ar', name: '2026 칼국수로드', key: 'kalguksu' },
  ],
};

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
}
function saveJson(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2) + '\n', 'utf8');
}
function nowKST() {
  return new Date().toISOString().replace('Z', '+09:00');  // approximation
}

// 게시판 한 페이지에서 게시물 메타 추출
async function scrapeBoard(page, bid) {
  await page.goto(`https://cafe.daum.net/redtraintour/${bid}`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2500);

  const iframe = await page.$('iframe#down').then(f => f || page.$('iframe'));
  if (!iframe) return [];
  const frame = await iframe.contentFrame();
  if (!frame) return [];

  // iframe 내부 게시물 추출
  const posts = await frame.evaluate(() => {
    const rows = [...document.querySelectorAll('tr')].filter(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 3) return false;
      return /^\d{2,5}$/.test((tds[0].innerText||'').trim());
    });
    return rows.slice(0, 25).map(tr => {
      const tds = [...tr.querySelectorAll('td')];
      const pid = (tds[0].innerText||'').trim();
      const longest = tds.slice(1)
        .map(t => (t.innerText||'').replace(/\s+/g,' ').trim())
        .reduce((a,b) => b.length > a.length ? b : a, '');
      const rowText = (tr.innerText||'').replace(/\s+/g,' ');
      const dateM = rowText.match(/(\d{2}\.\d{2}\.\d{2})/);
      const title = longest
        .split(' 댓글수')[0]
        .split(' 사진첨부')[0]
        .split(' 동영상첨부')[0]
        .slice(0, 200);
      return { pid, title, posted: dateM ? '20' + dateM[1].replace(/\./g, '-') : null };
    });
  });
  return posts;
}

// 제목에서 연도·계절 추출
function extractYear(title, postedDate) {
  const m = title.match(/(\b20\d{2}\b)/);
  if (m) return parseInt(m[1]);
  if (postedDate) return parseInt(postedDate.slice(0, 4));
  return new Date().getFullYear();
}
function extractSeason(title, year) {
  // 제목에서 X월 추출 → 계절
  const m = title.match(/(\d{1,2})\s*월/);
  if (!m) return '봄';
  const month = parseInt(m[1]);
  if (month >= 3 && month <= 5) return '봄';
  if (month >= 6 && month <= 8) return '여름';
  if (month >= 9 && month <= 11) return '가을';
  return '겨울';
}
function extractRegion(title, bid) {
  // 해외 게시판은 자동으로 해외
  if (bid === 'RfFv' || bid === 'S2Ss') return '해외';
  // 키워드 매칭
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
  for (const [kw, reg] of map) {
    if (t.includes(kw)) return reg;
  }
  return '전국';
}

// 게시판들 처리
async function syncPastTravels(page) {
  const file = loadJson('past-travels.json');
  const existing = new Set(file.posts.map(p => `${p.bid}/${p.pid}`));
  let added = 0;

  for (const board of [...BOARDS.past]) {
    console.log(`[past] ${board.name} (${board.bid}) 스크래핑…`);
    const posts = await scrapeBoard(page, board.bid);
    for (const post of posts) {
      const key = `${board.bid}/${post.pid}`;
      if (existing.has(key)) continue;
      const year = extractYear(post.title, post.posted);
      const season = extractSeason(post.title, year);
      const region = extractRegion(post.title, board.bid);
      file.posts.unshift({
        bid: board.bid,
        pid: post.pid,
        title: post.title,
        year,
        season,
        region,
        ...(region === '해외' ? { country: '해외' } : {}),
        posted: post.posted,
      });
      existing.add(key);
      added++;
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
  const existing = new Set(file.posts.map(p => p.pid));
  let added = 0;
  for (const board of BOARDS.reviews) {
    console.log(`[reviews] ${board.name} 스크래핑…`);
    const posts = await scrapeBoard(page, board.bid);
    for (const post of posts) {
      if (existing.has(post.pid)) continue;
      file.posts.unshift({
        pid: post.pid,
        title: post.title,
        trip: '기타',
        year: extractYear(post.title, post.posted),
        keywords: ''
      });
      existing.add(post.pid);
      added++;
      console.log(`  ✚ ${post.pid}: ${post.title.slice(0, 50)}`);
    }
  }
  file.lastSync = nowKST();
  saveJson('reviews.json', file);
  console.log(`✓ reviews.json — ${added}건 추가`);
  return added;
}

async function syncStories(page) {
  const file = loadJson('stories.json');
  let added = 0;
  for (const board of BOARDS.stories) {
    const section = file.sections[board.key];
    if (!section) continue;
    const existing = new Set(section.posts.map(p => p.pid));
    console.log(`[stories/${board.key}] ${board.name} 스크래핑…`);
    const posts = await scrapeBoard(page, board.bid);
    for (const post of posts) {
      if (existing.has(post.pid)) continue;
      section.posts.unshift({ pid: post.pid, title: post.title });
      existing.add(post.pid);
      added++;
      console.log(`  ✚ ${post.pid}: ${post.title.slice(0, 50)}`);
    }
  }
  file.lastSync = nowKST();
  saveJson('stories.json', file);
  console.log(`✓ stories.json — ${added}건 추가`);
  return added;
}

async function syncPlaces(page) {
  const file = loadJson('places.json');
  let added = 0;
  for (const board of BOARDS.places) {
    const section = file.sections[board.key];
    if (!section) continue;
    const existing = new Set(section.posts.map(p => p.pid));
    console.log(`[places/${board.key}] ${board.name} 스크래핑…`);
    const posts = await scrapeBoard(page, board.bid);
    for (const post of posts) {
      if (existing.has(post.pid)) continue;
      section.posts.unshift({ pid: post.pid, title: post.title, tag: '' });
      existing.add(post.pid);
      added++;
      console.log(`  ✚ ${post.pid}: ${post.title.slice(0, 50)}`);
    }
  }
  file.lastSync = nowKST();
  saveJson('places.json', file);
  console.log(`✓ places.json — ${added}건 추가`);
  return added;
}

(async () => {
  console.log('🔄 다음 카페 동기화 시작:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  let totalAdded = 0;
  try {
    totalAdded += await syncPastTravels(page);
    totalAdded += await syncReviews(page);
    totalAdded += await syncStories(page);
    totalAdded += await syncPlaces(page);
  } catch (err) {
    console.error('❌ 스크래핑 오류:', err.message);
    // 일부 보드 실패해도 다른 것은 저장된 상태 유지
  } finally {
    await browser.close();
  }

  console.log(`\n✅ 동기화 완료 — 총 ${totalAdded}건 신규 추가`);
})();
