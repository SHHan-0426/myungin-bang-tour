// 명인방투어 — PWA 등록 + "홈 화면에 추가" 프롬프트
(function(){
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        // console.log('[명인방투어] PWA 등록 완료', reg.scope);
      }).catch(err => {
        // 정적 호스팅이라 등록 실패 가능 — 조용히 무시
      });
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
