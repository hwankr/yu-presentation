/* ============================================================
   slide-2.js — 슬라이드 2 (핵심 인사이트 · "관리") 애니메이션
   여러 에너지 키워드가 빛나다 → 전등 꺼지듯 하나하나 소등 → 텅 빈 어둠 →
   위에서 따뜻한 스포트라이트가 내려오고, 그 빛 속에서 "관리"가
   초점이 잡히듯(흐림→선명) 또렷이 떠오른다. (작았다 커지는 연출 아님)
   전역 객체 AiceSlide2 { init, replay } 노출
   ============================================================ */
window.AiceSlide2 = (function () {
  'use strict';

  var tl;            // 메인 타임라인
  var kwEls = [];    // 키워드 요소 배열
  var played = false;

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

      // '켜진(빛나는)' 상태를 쉬는 값으로 저장 — build()의 .from 이 여기서 점등
      var litOp = 0.78 + depth * 0.22;
      var glow  = 'drop-shadow(0 0 ' + (8 + depth * 15).toFixed(1) +
                  'px rgba(255,255,255,' + (0.32 + depth * 0.4).toFixed(2) + '))';
      el._litFilter = glow;
      gsap.set(el, { xPercent: -50, yPercent: -50, opacity: litOp, filter: glow });
      kwEls.push(el);
    }
  }

  /* ----- 타임라인 ----- */
  function build() {
    var core    = document.querySelector('#slide-2 .core');
    var coreInk = document.querySelector('#slide-2 .core-ink');
    var spot    = document.querySelector('#slide-2 .bg-spot');
    if (!core || !coreInk || !kwEls.length) return;

    /* 스포트라이트 요소 */
    var beam = document.getElementById('s2-lamp');    // 빛 원뿔 SVG(위에서 내려오는 빔)
    var pool = document.getElementById('s2-pool');    // 빛 웅덩이('관리'에 닿는 빛)

    if (tl) tl.kill();

    /* '관리' 글로우 — blur + drop-shadow 한 묶음.
       히어로 크기 그대로 두고, 흐림→선명으로 '현상'되듯 나타난다(작았다 커지지 않는다). */
    var glowOff  = 'blur(16px) drop-shadow(0 0 26px rgba(255,236,206,0))';
    var glowOn   = 'blur(0px) drop-shadow(0 0 72px rgba(255,242,216,0.95))';
    var glowHero = 'blur(0px) drop-shadow(0 0 46px rgba(255,214,140,0.68))';

    gsap.set(coreInk, { color: 'rgba(244,244,242,1)' });
    // '관리'는 히어로 크기 그대로 — 처음엔 안 보이고, 흐릿하게 + 살짝 아래에서 대기
    gsap.set(core, { xPercent: -50, yPercent: -50, y: 40, opacity: 0, filter: glowOff });

    // 스포트라이트 — 시작은 꺼짐(빔은 위에서부터 뻗어내릴 준비, 웅덩이는 닫힘)
    gsap.set(beam, { xPercent: -50, transformOrigin: '50% 0%', scaleY: 0, opacity: 0 });
    gsap.set(pool, { xPercent: -50, yPercent: -50, scale: 0.62, opacity: 0 });

    tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });

    // 1) 점등 — 키워드들이 화면 곳곳에서 하나둘 불을 켠다
    tl.from(kwEls, {
      opacity: 0, scale: 0.72, filter: OFF_GLOW,
      duration: 0.75, ease: 'power2.out',
      stagger: { each: 0.045, from: 'random' }
    }, 0);

    // 2) 짧은 호흡 — 모든 키워드가 빛나는 상태
    tl.addLabel('lit', 2.3);

    // 3) 소등 — 전등 꺼지듯 하나하나 (무작위 순서, 빨라졌다 마지막 몇 개는 느려짐)
    tl.addLabel('off', 'lit');
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
      tl.add(sub, 'off+=' + t.toFixed(3));

      var gap = (p < 0.72)
        ? 0.20 - 0.14 * (p / 0.72)                     // 가속
        : 0.06 + 0.28 * ((p - 0.72) / 0.28);           // 마지막 몇 개는 감속(영화적 리듬)
      t += gap + (Math.random() * 0.03 - 0.015);
    }

    // 어둠이 깔린다 — 배경 스포트라이트가 사그라들고 무대가 텅 빈다
    tl.to(spot, { opacity: 0.24, duration: t * 0.8, ease: 'power1.in' }, 'off');

    // 4) 정적 — 텅 빈 어둠 (짧은 침묵)
    tl.addLabel('dark', 'off+=' + (t + 0.7).toFixed(3));

    // 5) 스포트라이트 점화 — 위에서 따뜻한 빛 원뿔이 내리뻗고, 빛 웅덩이가 피어난다
    tl.addLabel('light', 'dark');
    tl.to(beam, { opacity: 1, duration: 0.25, ease: 'power1.out' }, 'light');
    tl.to(beam, { scaleY: 1,  duration: 0.9,  ease: 'power3.out' }, 'light');   // 빛줄기가 내리뻗음
    tl.to(pool, { opacity: 1, scale: 1, duration: 1.15, ease: 'power2.out' }, 'light+=0.36');
    tl.to(spot, { opacity: 0.44, duration: 1.7, ease: 'power2.out' }, 'light+=0.2');

    // 6) '관리' 현상 — 빛 속에서 초점이 잡히며 또렷이 떠오른다
    //    히어로 크기 그대로: 흐림→선명(focus pull) + 살짝 떠오름 + 점화 섬광 → 노란빛으로 안정
    tl.addLabel('reveal', 'light+=0.5');
    tl.to(core, { opacity: 1,       duration: 1.4,  ease: 'power2.out'   }, 'reveal');
    tl.to(core, { filter: glowOn,   duration: 1.15, ease: 'power2.out'   }, 'reveal');
    tl.to(core, { y: 0,             duration: 2.1,  ease: 'power3.out'   }, 'reveal');
    tl.to(core, { filter: glowHero, duration: 1.6,  ease: 'power2.inOut' }, 'reveal+=1.15');

    return tl;
  }

  /* ----- 뷰포트 진입 시 1회 재생 ----- */
  function play() {
    if (!tl || played) return;
    played = true;
    tl.play(0);
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
    scatter();
    build();
    play();
  }

  return { init: init, replay: replay };
})();
