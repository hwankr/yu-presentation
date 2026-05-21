/* ============================================================
   slide-2.js — 슬라이드 2 (핵심 인사이트 · "관리") 애니메이션
   진입 시: 에너지 키워드들이 흩어진 채 하나둘 불을 켠다(자동).
   스페이스바: 전등 꺼지듯 하나하나 소등 → 끝까지 "관리"만 남아
   영화처럼 크게 피어오른다.
   전역 객체 AiceSlide2 { init, replay, advance } 노출
   ============================================================ */
window.AiceSlide2 = (function () {
  'use strict';

  var tlEnter;       // 입장 타임라인 — 키워드 점등 (뷰포트 진입 시 자동)
  var tlConverge;    // 수렴 타임라인 — 소등 → '관리' 개화 (스페이스바)
  var kwEls = [];    // 키워드 요소 배열
  var played = false;     // 입장(점등)이 시작됐는가
  var converged = false;  // 수렴이 시작됐는가

  /* 빛났다 꺼질 에너지 절약 키워드 (편집 가능) */
  var KEYWORDS = [
    '태양광', '단열', 'LED 조명', '대기전력', '고효율 가전',
    '절전 모드', '스마트 플러그', '적정 온도', '전기차', '자연 채광',
    '사용량 측정', '피크 회피', '인버터', '에너지 등급', '재생에너지',
    '난방 효율', '콘센트 차단', '수요 반응', '실시간 모니터링', '행동 습관'
  ];

  var OFF_GLOW = 'drop-shadow(0 0 0px rgba(255,255,255,0))';   // 꺼진 상태

  /* ----- 배경 파티클 ----- */
  function makeParticles() {
    var pc = document.getElementById('s2-particles');
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

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ----- 키워드 생성 · 화면 전체에 흩뿌리기 ----- */
  function scatter() {
    var field = document.getElementById('s2-field');
    if (!field) return;
    field.innerHTML = '';
    kwEls = [];

    var COLS = 5, ROWS = 4;
    var cells = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) cells.push({ c: c, r: r });
    }
    shuffle(cells);   // 키워드를 무작위 셀에 배치 → 격자 느낌 제거

    var words = KEYWORDS.slice(0, COLS * ROWS);
    for (var i = 0; i < words.length; i++) {
      var cell  = cells[i];
      var depth = Math.random();                       // 0..1 — 원근감
      var len   = words[i].replace(/\s/g, '').length;

      var el = document.createElement('span');
      el.className = 'kw';
      el.textContent = words[i];

      // 가까울수록(depth 큼) 크다
      var size = (1.05 + depth * 0.95) * (len > 5 ? 0.78 : 1);
      el.style.fontSize = size.toFixed(2) + 'rem';

      // 5×4 그리드 + 지터 → 화면 곳곳에 흩뿌림(중앙은 '관리' 자리라 비워둠)
      var x = 20 + cell.c * 15 + (Math.random() * 8 - 4);
      var y = 20 + cell.r * 20 + (Math.random() * 8 - 4);
      el.style.left = x + '%';
      el.style.top  = y + '%';

      field.appendChild(el);

      // '켜진(빛나는)' 상태를 쉬는 값으로 저장 — tlEnter의 .from 이 여기서 점등
      var litOp = 0.78 + depth * 0.22;
      var glow  = 'drop-shadow(0 0 ' + (8 + depth * 15).toFixed(1) +
                  'px rgba(255,255,255,' + (0.32 + depth * 0.4).toFixed(2) + '))';
      el._litFilter = glow;
      gsap.set(el, { xPercent: -50, yPercent: -50, opacity: litOp, filter: glow });
      kwEls.push(el);
    }
  }

  /* ----- 타임라인 (입장 · 수렴) ----- */
  function build() {
    var core    = document.querySelector('#slide-2 .core');
    var coreInk = document.querySelector('#slide-2 .core-ink');
    var spot    = document.querySelector('#slide-2 .bg-spot');
    if (!core || !coreInk || !kwEls.length) return;

    if (tlEnter)    tlEnter.kill();
    if (tlConverge) tlConverge.kill();

    var SMALL = 0.18;                                  // 필드 단계 '관리' 축소 배율
    var coreLit   = 'drop-shadow(0 0 24px rgba(255,255,255,0.5))';
    var coreFocus = 'drop-shadow(0 0 30px rgba(255,255,255,0.9))';
    var coreHero  = 'drop-shadow(0 0 46px rgba(255,255,255,0.6))';

    gsap.set(coreInk, { color: 'rgba(244,244,242,1)' });
    gsap.set(core, { xPercent: -50, yPercent: -50, scale: SMALL, filter: coreLit });
    gsap.set(spot, { opacity: 1 });                    // 재생 대비 — 스포트라이트 원복

    /* ── 입장 — 키워드들과 '관리'가 흩어진 채 하나둘 불을 켠다 ── */
    tlEnter = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    tlEnter.from(kwEls, {
      opacity: 0, scale: 0.72, filter: OFF_GLOW,
      duration: 0.75, ease: 'power2.out',
      stagger: { each: 0.045, from: 'random' }
    }, 0);
    tlEnter.from(core, { opacity: 0, duration: 0.85, ease: 'power2.out' }, 0.3);

    /* ── 수렴 — 스페이스바: 소등 → '관리'가 피어오른다 ── */
    tlConverge = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });

    // 1) 소등 — 전등 꺼지듯 하나하나 (무작위 순서, 빨라졌다 마지막 몇 개는 느려짐)
    var order = shuffle(kwEls.slice());
    var N = order.length, t = 0;
    for (var i = 0; i < N; i++) {
      var el = order[i];
      var p  = N > 1 ? i / (N - 1) : 0;
      var fd = 0.05 + Math.random() * 0.03;            // 깜빡임 길이

      var sub = gsap.timeline();
      sub.to(el, { opacity: '*=0.3', duration: fd, ease: 'none' })          // 깜빡 — 어두워짐
         .to(el, { opacity: '*=2.7', duration: fd * 0.8, ease: 'none' })    // 깜빡 — 되살아남
         .to(el, { opacity: 0, filter: OFF_GLOW,                            // 소등
                   duration: 0.3 + Math.random() * 0.12, ease: 'power2.in' });
      tlConverge.add(sub, t.toFixed(3));

      var gap = (p < 0.72)
        ? 0.20 - 0.14 * (p / 0.72)                     // 가속
        : 0.06 + 0.28 * ((p - 0.72) / 0.28);           // 마지막 몇 개는 감속(영화적 리듬)
      t += gap + (Math.random() * 0.03 - 0.015);
    }

    // 어둠이 깔리며 '관리'의 빛이 강해지고, 배경 스포트라이트는 사그라든다
    tlConverge.to(core, { filter: coreFocus, duration: t * 0.85, ease: 'power1.in' }, 0.3);
    tlConverge.to(spot, { opacity: 0.32,     duration: t * 0.75, ease: 'power1.in' }, 0);

    // 2) 정적 — '관리' 하나만 어둠 속에 남는다
    tlConverge.addLabel('alone', (t + 0.45).toFixed(3));

    // 3) 개화 — '관리'가 영화처럼 크게 피어오른다
    tlConverge.to(core, { scale: 1,        duration: 1.7, ease: 'expo.out'  }, 'alone');
    tlConverge.to(core, { filter: coreHero, duration: 1.8, ease: 'power2.out' }, 'alone+=0.05');
    tlConverge.to(spot, { opacity: 1,       duration: 1.9, ease: 'power2.out' }, 'alone+=0.1');
  }

  /* ----- 뷰포트 진입 시 입장(점등) 1회 재생 ----- */
  function play() {
    if (!tlEnter || played) return;
    played = true;
    tlEnter.play(0);
  }

  function observe() {
    var el = document.getElementById('slide-2');
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

  /* ----- 발표자 단계 진행 (스페이스바) -----
     반환 true = 내부 단계 소비(덱 멈춤) · false = 더 없음(덱이 다음 슬라이드로) */
  function advance() {
    if (!played) { play(); return true; }            // 안전장치 — 점등 먼저
    if (!converged) {
      converged = true;
      if (tlEnter && tlEnter.progress() < 1) tlEnter.progress(1);   // 점등 즉시 완료
      tlConverge.play(0);                            // '관리'로 모여들기 시작
      return true;
    }
    if (tlConverge && tlConverge.progress() < 1) {   // 수렴 중이면 끝까지 당김
      tlConverge.progress(1);
      return true;
    }
    return false;   // 수렴까지 끝 → 다음 슬라이드
  }

  /* ----- 공개 API ----- */
  function setup() {
    scatter();
    build();
    observe();
  }
  function init() {
    makeParticles();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(setup);
    } else {
      setup();
    }
  }
  function replay() {
    played = false;
    converged = false;
    scatter();
    build();
    play();
  }

  return { init: init, replay: replay, advance: advance };
})();
