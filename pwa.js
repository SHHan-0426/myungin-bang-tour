// 명인방투어 — PWA 등록 + "홈 화면에 추가" 프롬프트
(function(){
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
