/* 공용 헤더 햄버거 메뉴 — 하위 페이지(여행·여행스케치·명인소 등)에서 사용.
   메뉴 버튼(button[aria-label="메뉴"])을 찾아 팝업을 만들고 토글한다.
   대문(index.html)은 자체 메뉴 로직이 있으므로 이 스크립트를 넣지 않는다. */
(function () {
  function init() {
    var btn = document.querySelector('button[aria-label="메뉴"]');
    if (!btn) return;
    if (btn.dataset.menuWired === '1') return;   // 중복 방지
    btn.dataset.menuWired = '1';

    var pop = document.getElementById('menu-pop');
    if (!pop) {
      pop = document.createElement('div');
      pop.className = 'menu-pop';
      pop.id = 'menu-pop';
      pop.innerHTML =
        '<a href="./index.html">홈</a>' +
        '<a href="./tour.html">여행</a>' +
        '<a href="./story.html">여행스케치</a>' +
        '<a href="./place.html">명인소</a>' +
        '<a href="./my.html">마이</a>' +
        '<a href="./bapcha.html">밥차 · 인생 2막 공동체</a>' +
        '<div class="mp-sep"></div>' +
        '<a class="mp-cafe" href="https://m.cafe.daum.net/redtraintour" target="_blank" rel="noopener">다음 카페 로그인·바로가기 →</a>';
      document.body.appendChild(pop);
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      pop.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (!pop.contains(e.target) && !btn.contains(e.target)) pop.classList.remove('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') pop.classList.remove('open');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
