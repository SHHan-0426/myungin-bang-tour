// 명인방투어 — PWA 등록 + 새로고침 버튼 자동 주입 + "홈 화면에 추가"
(function(){
  // 헤더 우상단 버튼 자동 주입 — 모든 페이지에 동일하게
  function injectHeaderButtons(){
    const target =
      document.querySelector('.nav-icons') ||
      document.querySelector('.top-bar-detail .right');
    if (!target || target.dataset.injected === '1') return;
    target.dataset.injected = '1';

    // ⓐ 다음 카페 바로가기 (로그인 포함)
    const cafe = document.createElement('a');
    cafe.href = 'https://cafe.daum.net/redtraintour';
    cafe.target = '_blank';
    cafe.rel = 'noopener';
    cafe.title = '다음 카페에서 로그인 / 원문 보기';
    cafe.style.cssText =
      'display:inline-flex;align-items:center;gap:3px;'+
      'padding:5px 10px;border-radius:999px;'+
      'background:#fff8ec;color:#7a1b25;'+
      'font-size:11px;font-weight:800;text-decoration:none;'+
      'border:1px solid #c7a25a;'+
      'white-space:nowrap;margin-right:4px';
    cafe.innerHTML =
      '<span>다음 카페</span>'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px"><path d="M7 17 17 7"/><path d="M9 7h8v8"/></svg>';
    target.insertBefore(cafe, target.firstChild);

    // ⓑ ↻ 새로고침
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', '새로고침');
    btn.title = '새로고침';
    btn.style.cssText = 'background:none;border:0;padding:0;color:inherit;cursor:pointer';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px;display:block"><path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/></svg>';
    btn.onclick = () => {
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
          .finally(() => location.reload());
      } else {
        location.reload();
      }
    };
    // 새로고침 버튼은 다음 카페 버튼 다음(오른쪽)에 배치
    target.insertBefore(btn, cafe.nextSibling);
  }
  // 하위 호환: 기존 코드 호출지점에서 사용했던 이름 유지
  const injectRefreshButton = injectHeaderButtons;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectRefreshButton);
  } else {
    injectRefreshButton();
  }

  // ⭐ PWA 첫 실행 시 항상 홈으로
  // 이미 설치하신 분의 옛 start_url(tour.html 등)을 덮어쓰기 위함
  try {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                        || window.navigator.standalone === true;
    if (isStandalone && !sessionStorage.getItem('mb-pwa-launched')) {
      sessionStorage.setItem('mb-pwa-launched', '1');
      const path = location.pathname;
      const onHome = path === '/' || path.endsWith('/index.html');
      if (!onHome) {
        location.replace('/');
        return;  // 리다이렉트 직후 나머지 스크립트 실행 안함
      }
    }
  } catch(e) {}

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        // 새 버전 SW가 활성화되면 페이지 자동 리로드 (캐시 stale 방지)
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'activated' && navigator.serviceWorker.controller) {
              // 기존에 컨트롤러가 있던 상태에서 새 SW가 활성 → 페이지 리로드
              window.location.reload();
            }
          });
        });
        // 1시간마다 update 체크
        setInterval(() => reg.update(), 3600000);
      }).catch(() => {});
    });
  }

  // beforeinstallprompt — 사용자가 직접 설치 가능하도록 버튼 노출 (옵션)
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // 마이 페이지에 설치 버튼이 있다면 여기서 노출
    const btn = document.getElementById('install-pwa-btn');
    if (btn) {
      btn.style.display = 'inline-flex';
      btn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          deferredPrompt = null;
          if (choice.outcome === 'accepted') btn.style.display = 'none';
        }
      });
    }
  });
})();
