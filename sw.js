// 명인방투어 — 서비스 워커
// 오프라인 캐시 + "홈 화면에 추가" PWA 지원

const CACHE_VERSION = 'mb-tour-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './tour.html',
  './tour-detail.html',
  './story.html',
  './place.html',
  './my.html',
  './shared.css',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon.svg',
  './assets/hero.jpg',
  './assets/tour-01.jpg',
  './assets/tour-02.jpg',
  './assets/tour-03.jpg',
  './assets/story-01.jpg',
  './assets/place-01.jpg',
  './assets/place-02.jpg',
  './assets/place-03.jpg',
  './assets/place-04.jpg',
  './assets/avatar-01.jpg',
  './assets/avatar-02.jpg',
  './data/tours.json',
  './data/past-travels.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // 외부 도메인(unsplash, daumcdn, leaflet 등)은 패스 — 브라우저 기본
  if (url.origin !== self.location.origin) return;

  // data/*.json 은 stale-while-revalidate (네트워크 우선, 캐시 폴백)
  if (url.pathname.includes('/data/')) {
    event.respondWith(
      fetch(event.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(event.request, copy));
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // 그 외: 캐시 우선, 없으면 네트워크
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(res => {
        if (res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(event.request, copy));
        }
        return res;
      })
    )
  );
});
