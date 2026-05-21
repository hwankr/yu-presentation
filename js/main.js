/* ============================================================
   main.js — 발표 덱 부트스트랩
   슬라이드 초기화 · 슬라이드 간 이동(스크롤 스냅)을 관리한다.
   슬라이드가 늘어나면 init 목록에 추가한다.
   ============================================================ */
(function () {
  'use strict';

  window.addEventListener('DOMContentLoaded', function () {
    AiceSlide1.init();
    AiceSlide2.init();
    AiceSlide3.init();
    AiceSlide4.init();
    AiceSlide5.init();
    AiceSlide6.init();
    AiceSlide7.init();
    AiceSlide8.init();
  });

  /* ----- 슬라이드 목록 · 현재 위치 ----- */
  function slides() {
    return Array.prototype.slice.call(document.querySelectorAll('.slide'));
  }
  function currentIndex() {
    var list = slides();
    var mid = window.innerHeight / 2;
    var best = 0, bestDist = Infinity;
    for (var i = 0; i < list.length; i++) {
      var r = list[i].getBoundingClientRect();
      var d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  /* ----- 슬라이드 이동 ----- */
  function go(dir) {
    var list = slides();
    var next = Math.min(list.length - 1, Math.max(0, currentIndex() + dir));
    list[next].scrollIntoView({ behavior: 'smooth' });
  }

  /* ----- 슬라이드 내부 단계 진행 (슬라이드 3의 가계부 3단계, 슬라이드 4의 B-EMS→C-EMS) ----- */
  function advanceCurrent() {
    var id = slides()[currentIndex()].id;
    if (id === 'slide-2') return AiceSlide2.advance();
    if (id === 'slide-3') return AiceSlide3.advance();
    if (id === 'slide-4') return AiceSlide4.advance();
    return false;
  }

  /* ----- 오프닝 커튼 ----- */
  var curtain = document.getElementById('curtain');
  var curtainUp = !!curtain;   // 커튼이 떠 있는 상태(발표 시작 전)

  function liftCurtain() {
    if (!curtainUp) return;
    curtainUp = false;
    if (curtain) {
      curtain.classList.add('lift');
      setTimeout(function () {
        if (curtain && curtain.parentNode) curtain.parentNode.removeChild(curtain);
      }, 900);
    }
    AiceSlide1.start();   // 슬라이드 1 인트로 애니메이션 시작
  }

  /* ----- 키보드: 발표자 조작 ----- */
  window.addEventListener('keydown', function (e) {
    if (!e.key) return;
    var k = e.key;
    // 커튼이 떠 있으면 — 첫 입력은 커튼을 걷어 발표를 시작한다
    if (curtainUp) {
      if (k === ' ' || k === 'Enter' || k === 'ArrowRight' ||
          k === 'ArrowDown' || k === 'PageDown') {
        e.preventDefault();
        liftCurtain();
      }
      return;
    }
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown' || k === ' ') {
      e.preventDefault();
      if (advanceCurrent()) return;   // 내부 단계가 있으면 슬라이드 이동 보류
      go(1);
    } else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') {
      e.preventDefault(); go(-1);
    } else if (k.toLowerCase() === 'r') {
      // R: 현재 슬라이드 인트로 다시 재생
      var id = slides()[currentIndex()].id;
      if (id === 'slide-1') AiceSlide1.replay();
      else if (id === 'slide-2') AiceSlide2.replay();
      else if (id === 'slide-3') AiceSlide3.replay();
      else if (id === 'slide-4') AiceSlide4.replay();
      else if (id === 'slide-5') AiceSlide5.replay();
      else if (id === 'slide-6') AiceSlide6.replay();
      else if (id === 'slide-7') AiceSlide7.replay();
      else if (id === 'slide-8') AiceSlide8.replay();
    }
  });
})();
