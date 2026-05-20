/* ============================================================
   slide-3.js — 슬라이드 3 (측정 · 피터 드러커 인용) 애니메이션
   어둠 속에서 인물 사진이 서서히 현상되고 →
   인용구의 "측정 → 관리 → 개선"이 한 단어씩 점화 →
   인용구는 가라앉고 "측정"이 절약의 출발점으로 남는다.
   전역 객체 AiceSlide3 { init, replay } 노출
   ============================================================ */
window.AiceSlide3 = (function () {
  'use strict';

  var tl;                // 메인 타임라인
  var played = false;

  var OFF_GLOW = 'drop-shadow(0 0 0px rgba(255,255,255,0))';      // 점화 전
  var KW_GLOW  = 'drop-shadow(0 0 14px rgba(255,255,255,0.45))';  // 점화 후

  var IMG_DARK = 'grayscale(1) brightness(0.12) contrast(1.04)';  // 현상 전
  var IMG_LIT  = 'grayscale(1) brightness(0.85) contrast(1.04)';  // 현상 후

  /* ----- 배경 파티클 (슬라이드 1·2 패턴) ----- */
  function makeParticles() {
    var pc = document.getElementById('s3-particles');
    if (!pc) return;
    for (var i = 0; i < 14; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top  = Math.random() * 100 + '%';
      pc.appendChild(p);
      gsap.set(p, { opacity: 0.05 + Math.random() * 0.16 });
      gsap.to(p, {
        y: -(70 + Math.random() * 150),
        opacity: 0,
        duration: 12 + Math.random() * 9,
        repeat: -1,
        delay: Math.random() * 11,
        ease: 'none'
      });
    }
  }

  /* ----- 사진 로드 실패 시 깨진 아이콘을 숨김(좌측 패널은 어둠으로 대체) ----- */
  function guardImage() {
    var img = document.querySelector('#slide-3 .portrait-img');
    if (!img) return;
    function hide() { img.style.display = 'none'; }
    img.addEventListener('error', hide);
    // 리스너 등록 전에 이미 로드가 끝나 실패한 경우(naturalWidth 0)도 처리
    if (img.complete && img.naturalWidth === 0) hide();
  }

  /* ----- 키워드 한 묶음 점화 — 흐림 → 솔리드 흰색 + 글로우 + 미세 펄스 ----- */
  function ignite(timeline, els, at) {
    if (!els || !els.length) return;
    timeline.to(els, {
      color: 'rgba(244,244,242,1)', filter: KW_GLOW,
      duration: 0.5, ease: 'power2.out'
    }, at);
    timeline.fromTo(els, { scale: 1 }, {
      scale: 1.07, duration: 0.2, ease: 'power2.out',
      yoyo: true, repeat: 1
    }, at);
  }

  /* ----- 타임라인 ----- */
  function build() {
    var img    = document.querySelector('#slide-3 .portrait-img');
    var spot   = document.querySelector('#slide-3 .bg-spot');
    var rule   = document.querySelector('#slide-3 .attr-rule');
    var attrEl = document.querySelectorAll('#slide-3 .attr-name, #slide-3 .attr-role');
    var mark   = document.querySelector('#slide-3 .saying .mark');
    var lines  = document.querySelectorAll('#slide-3 .saying .line');
    var saying = document.querySelector('#slide-3 .saying');

    var kwAll     = document.querySelectorAll('#slide-3 .saying .kw');
    var kwMeasure = document.querySelectorAll('#slide-3 .saying .kw[data-kw="measure"]');
    var kwManage  = document.querySelectorAll('#slide-3 .saying .kw[data-kw="manage"]');
    var kwImprove = document.querySelectorAll('#slide-3 .saying .kw[data-kw="improve"]');

    if (!saying) return;
    if (tl) tl.kill();

    /* ----- 초기 상태 (현상 전 · 점화 전) ----- */
    if (img) gsap.set(img, { opacity: 0, scale: 1.06, filter: IMG_DARK });
    gsap.set(spot, { opacity: 0.55 });
    gsap.set(rule, { width: 0 });
    gsap.set(attrEl, { opacity: 0, y: 12 });
    gsap.set(mark, { opacity: 0, y: 10 });
    gsap.set(lines, { opacity: 0, y: 26 });
    gsap.set(kwAll, { color: 'rgba(244,244,242,0.42)', filter: OFF_GLOW });

    tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });

    /* 1) 현상 — 사진이 어둠 속에서 서서히 인화된다 */
    if (img) {
      tl.to(img, { opacity: 1, duration: 1.3, ease: 'power2.out' }, 0);
      tl.to(img, { filter: IMG_LIT, duration: 1.95, ease: 'power2.out' }, 0);
      tl.to(img, { scale: 1, duration: 2.2, ease: 'expo.out' }, 0);
    }
    tl.to(spot, { opacity: 0.8, duration: 2.0, ease: 'power2.out' }, 0.2);

    /* 2) 라벨 — 출처가 떠오르고 룰 라인이 그어진다 */
    tl.to(attrEl, { opacity: 1, y: 0, duration: 0.7, stagger: 0.12 }, 1.15);
    tl.to(rule, { width: '3.2rem', duration: 0.7, ease: 'power2.inOut' }, 1.4);

    /* 3) 인용구 본문 — 따옴표와 줄이 스르륵 떠오른다 */
    tl.to(mark, { opacity: 1, y: 0, duration: 0.7 }, 1.6);
    tl.to(lines, { opacity: 1, y: 0, duration: 0.9, stagger: 0.22 }, 1.75);

    /* 4) 체인 점화 — 측정 → 관리 → 개선. 세 단어가 모두 켜진 채 마무리된다. */
    tl.addLabel('chain', 2.95);
    ignite(tl, kwMeasure, 'chain');
    ignite(tl, kwManage,  'chain+=0.55');
    ignite(tl, kwImprove, 'chain+=1.1');

    return tl;
  }

  /* ----- 뷰포트 진입 시 1회 재생 ----- */
  function play() {
    if (!tl || played) return;
    played = true;
    tl.play(0);
  }

  function observe() {
    var el = document.getElementById('slide-3');
    if (!el) return;
    if (!('IntersectionObserver' in window)) { play(); return; }   // 폴백
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting && entries[i].intersectionRatio >= 0.55) {
          play();
          io.disconnect();
          break;
        }
      }
    }, { threshold: [0, 0.55, 1] });
    io.observe(el);
  }

  /* ----- 공개 API ----- */
  function setup() {
    build();
    observe();
  }
  function init() {
    makeParticles();
    guardImage();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(setup);
    } else {
      setup();
    }
  }
  function replay() {
    played = false;
    build();
    play();
  }

  return { init: init, replay: replay };
})();
