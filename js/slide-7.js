/* ============================================================
   slide-7.js — 슬라이드 7 (SWOT 분석)
   2×2 매트릭스가 자동 재생된다. eyebrow → 외곽 프레임 → 십자
   분할선 드로잉 → 네 사분면이 순서대로 캐스케이드 등장 → 킥커.
   사분면을 클릭하면 그 칸이 매트릭스 중앙으로 확대된다 — 발표자가
   사분면을 하나씩 짚으며 설명할 수 있다.
   끝까지 남는 키워드는 "전략".
   전역 객체 AiceSlide7 { init, replay } 노출
   ============================================================ */
window.AiceSlide7 = (function () {
  'use strict';

  /* ----- SWOT 콘텐츠 (편집 가능) — DOM·그리드 순서: S · W · O · T ----- */
  var QUADS = [
    {
      letter: 'S', ko: '강점', en: 'Strength', tone: 'pos',
      items: [
        { lead: '선제적 운영',         sub: '피크 시간대를 미리 감지해 전기 요금 절감' },
        { lead: '데이터 기반 의사결정', sub: '투자 회수·예산 집행의 판단 근거 확보' },
        { lead: '운영 효율 개선',       sub: '지능형 가동 제어로 수작업 오류 감소' }
      ]
    },
    {
      letter: 'W', ko: '약점', en: 'Weakness', tone: 'neg',
      items: [
        { lead: '예측 모델 오차',  sub: '정확도가 학습 데이터의 양·질에 의존' },
        { lead: '제어 연동 한계',  sub: '실시간 자동 제어가 아직 미완성' },
        { lead: 'UI/UX 직관성',    sub: '일반 사용자 대상 시각화 개선 필요' }
      ]
    },
    {
      letter: 'O', ko: '기회', en: 'Opportunity', tone: 'pos',
      items: [
        { lead: '정책 연계',       sub: 'RE100·탄소중립 국고 지원 사업과 직결' },
        { lead: '대외 경쟁력',     sub: 'ESG 성과를 대학 경쟁력으로 전환' },
        { lead: '자산화·확장성',   sub: '누적 데이터가 리모델링 기획 자산' }
      ]
    },
    {
      letter: 'T', ko: '위협', en: 'Threat', tone: 'neg',
      items: [
        { lead: '차별성 입증',     sub: '기존 BEMS 대비 기술 우위 입증 필요' },
        { lead: '규제·행정 장벽',  sub: '복잡한 시설 관리 행정 절차' },
        { lead: '지속가능성 확보', sub: '배포 후 고도화·유지보수 인력·예산' }
      ]
    }
  ];

  /* 사분면 등장 시점(초) — 읽기 순서 S → W → O → T (편집 가능) */
  var QUAD_AT = [1.35, 1.92, 2.49, 3.06];

  /* hover 시 사분면이 중앙으로 확대되는 배율 (편집 가능) */
  var EXPAND_SCALE = 1.62;

  var tl;
  var played = false;
  var interactive = false;     // 클릭 인터랙션 활성 여부
  var focusedQuad = null;      // 현재 확대된 사분면 (없으면 null)
  var ambient = [];

  /* ============================================================
     배경 입자
     ============================================================ */
  function makeParticles() {
    var pc = document.getElementById('s7-particles');
    if (!pc) return;
    pc.innerHTML = '';
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

  /* ============================================================
     사분면 DOM 생성 — QUADS 배열로 네 카드를 채운다
     ============================================================ */
  function buildQuads() {
    var quads = document.querySelectorAll('#s7-swot .quad');
    for (var i = 0; i < quads.length && i < QUADS.length; i++) {
      var q = QUADS[i];
      var html = '';
      html += '<span class="ghost" aria-hidden="true">' + q.letter + '</span>';
      html += '<div class="quad-head">';
      html +=   '<span class="badge">' + q.letter + '</span>';
      html +=   '<div class="quad-titles">';
      html +=     '<span class="quad-ko">' + q.ko + '</span>';
      html +=     '<span class="quad-en">' + q.en + '</span>';
      html +=   '</div>';
      html += '</div>';
      html += '<ul class="items">';
      for (var j = 0; j < q.items.length; j++) {
        html += '<li class="item">' +
                  '<span class="item-lead">' + q.items[j].lead + '</span>' +
                  '<span class="item-sub">' + q.items[j].sub + '</span>' +
                '</li>';
      }
      html += '</ul>';
      quads[i].innerHTML = html;
    }
  }

  /* ============================================================
     타임라인
     ============================================================ */
  function build() {
    var eyebrow = document.getElementById('s7-eyebrow');
    var spot    = document.querySelector('#slide-7 .bg-spot');
    var frame   = document.querySelector('#s7-swot .swot-frame');
    var divH    = document.querySelector('#s7-swot .div-h');
    var divV    = document.querySelector('#s7-swot .div-v');
    var node    = document.querySelector('#s7-swot .node');
    var quads   = document.querySelectorAll('#s7-swot .quad');
    var kicker  = document.getElementById('s7-kicker');
    if (!quads.length || !frame) return;

    if (tl) tl.kill();
    killAmbient();
    interactive = false;
    focusedQuad = null;

    /* ----- 초기 상태 ----- */
    gsap.set(spot, { opacity: 0.5 });
    gsap.set(eyebrow, { opacity: 0, y: -8 });
    gsap.set(frame, { opacity: 0 });
    gsap.set(divH, { scaleX: 0 });
    gsap.set(divV, { scaleY: 0 });
    gsap.set(node, { scale: 0 });
    gsap.set(kicker, { opacity: 0, y: 10 });

    var i;
    for (i = 0; i < quads.length; i++) {
      gsap.set(quads[i], {
        opacity: 0, scale: 0.94, x: 0, y: 12,
        backgroundColor: 'rgba(244,244,242,0)',
        boxShadow: '0 0 0 0 rgba(244,244,242,0)'
      });
      gsap.set(quads[i].querySelector('.ghost'), {
        opacity: 0, scale: 0.78, transformOrigin: '100% 100%'
      });
      gsap.set(quads[i].querySelector('.badge'), { opacity: 0, scale: 0.6 });
      gsap.set(quads[i].querySelectorAll('.quad-ko, .quad-en'), { opacity: 0, x: -10 });
      gsap.set(quads[i].querySelectorAll('.item'), { opacity: 0, x: -12 });
      quads[i].style.zIndex = '';
    }

    /* ----- 타임라인 ----- */
    tl = gsap.timeline({
      paused: true,
      defaults: { ease: 'power3.out' },
      onComplete: onIntroDone
    });

    /* 1) eyebrow */
    tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.7 }, 0);

    /* 2) 외곽 프레임 → 십자 분할선 드로잉 → 중심 노드 */
    tl.to(frame, { opacity: 1, duration: 0.7, ease: 'power2.out' }, 0.35);
    tl.to(divH, { scaleX: 1, duration: 0.8, ease: 'expo.out' }, 0.5);
    tl.to(divV, { scaleY: 1, duration: 0.8, ease: 'expo.out' }, 0.66);
    tl.to(node, { scale: 1, duration: 0.5, ease: 'power3.out' }, 1.12);

    /* 3) 네 사분면 캐스케이드 등장 */
    for (i = 0; i < quads.length; i++) {
      revealQuad(tl, quads[i], QUAD_AT[i]);
    }

    /* 4) 마무리 킥커 — "전략" 솔리드 강조 */
    var last = QUAD_AT[QUAD_AT.length - 1];
    tl.to(kicker, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out' }, last + 1.45);

    return tl;
  }

  /* 사분면 한 칸 — 카드 → 고스트 글자 → 배지 → 라벨 → 항목 캐스케이드 */
  function revealQuad(timeline, quad, at) {
    var ghost  = quad.querySelector('.ghost');
    var badge  = quad.querySelector('.badge');
    var titles = quad.querySelectorAll('.quad-ko, .quad-en');
    var items  = quad.querySelectorAll('.item');

    timeline.to(quad,   { opacity: 1, scale: 1, y: 0, duration: 0.66 }, at);
    timeline.to(ghost,  { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out' }, at + 0.04);
    timeline.to(badge,  { opacity: 1, scale: 1, duration: 0.5 }, at + 0.12);
    timeline.to(titles, { opacity: 1, x: 0, duration: 0.5, stagger: 0.06 }, at + 0.18);
    timeline.to(items,  { opacity: 1, x: 0, duration: 0.52, stagger: 0.085 }, at + 0.3);
  }

  /* ============================================================
     인터랙티브 — 사분면 클릭 확대
     클릭한 사분면이 매트릭스 중앙으로 확대된다. 같은 칸을 다시
     클릭하거나 바깥을 클릭하면 원래 자리로 돌아간다.
     ============================================================ */
  function onIntroDone() {
    interactive = true;
    startAmbient();
  }

  function bindClicks() {
    var quads = document.querySelectorAll('#s7-swot .quad');
    for (var i = 0; i < quads.length; i++) {
      (function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();          /* 슬라이드 레벨 핸들러로 전파 방지 */
          toggleQuad(el);
        });
      })(quads[i]);
    }
    /* 사분면 바깥(빈 영역)을 클릭하면 확대를 해제한다 */
    var slide = document.getElementById('slide-7');
    if (slide) {
      slide.addEventListener('click', function () {
        if (interactive && focusedQuad) {
          unfocusAll();
          focusedQuad = null;
        }
      });
    }
  }

  /* 클릭 토글 — 같은 칸이면 닫고, 다른 칸이면 그 칸으로 전환 */
  function toggleQuad(el) {
    if (!interactive) return;
    if (focusedQuad === el) {
      unfocusAll();
      focusedQuad = null;
    } else {
      focusQuad(el);
      focusedQuad = el;
    }
  }

  /* 클릭한 사분면이 매트릭스 중앙으로 떠올라 메인으로 확대된다.
     나머지 셋은 제자리에서 살짝 물러나며 흐려진다. */
  function focusQuad(target) {
    var swot = document.getElementById('s7-swot');
    var quads = document.querySelectorAll('#s7-swot .quad');
    for (var i = 0; i < quads.length; i++) {
      var el = quads[i];
      if (el === target) {
        /* 사분면 중심 → 매트릭스 중심으로 옮길 거리 (transform 영향 없는 offset 기준) */
        var dx = swot.clientWidth  / 2 - (el.offsetLeft + el.offsetWidth  / 2);
        var dy = swot.clientHeight / 2 - (el.offsetTop  + el.offsetHeight / 2);
        el.style.zIndex = 10;
        gsap.to(el, {
          x: dx, y: dy, scale: EXPAND_SCALE, opacity: 1,
          backgroundColor: 'rgba(17,17,19,0.98)',
          boxShadow: '0 0 0 1px rgba(244,244,242,0.34)',
          duration: 0.62, ease: 'expo.out', overwrite: 'auto'
        });
      } else {
        el.style.zIndex = '';
        gsap.to(el, {
          x: 0, y: 0, scale: 0.95, opacity: 0.2,
          backgroundColor: 'rgba(244,244,242,0)',
          boxShadow: '0 0 0 0 rgba(244,244,242,0)',
          duration: 0.5, ease: 'power3.out', overwrite: 'auto'
        });
      }
    }
  }

  /* 모든 사분면이 원래 자리·크기로 되돌아온다 */
  function unfocusAll() {
    var quads = document.querySelectorAll('#s7-swot .quad');
    for (var i = 0; i < quads.length; i++) {
      (function (el) {
        gsap.to(el, {
          x: 0, y: 0, scale: 1, opacity: 1,
          backgroundColor: 'rgba(244,244,242,0)',
          boxShadow: '0 0 0 0 rgba(244,244,242,0)',
          duration: 0.58, ease: 'power3.out', overwrite: 'auto',
          onComplete: function () { el.style.zIndex = ''; }
        });
      })(quads[i]);
    }
  }

  /* ============================================================
     앰비언트 모션 — 재생 종료 후 중심 노드가 은은히 호흡
     ============================================================ */
  function startAmbient() {
    killAmbient();
    var node = document.querySelector('#s7-swot .node');
    if (node) {
      ambient.push(gsap.to(node, {
        boxShadow: '0 0 20px rgba(255,255,255,0.85)',
        duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: -1
      }));
    }
  }

  function killAmbient() {
    for (var i = 0; i < ambient.length; i++) ambient[i].kill();
    ambient = [];
  }

  /* ============================================================
     재생 제어
     ============================================================ */
  function play() {
    if (played) return;
    played = true;
    build();
    interactive = true;   // 슬라이드 진입 즉시 클릭 인터랙션 활성 (인트로 재생 중에도 가능)
    if (tl) tl.play(0);
  }

  function observe() {
    var el = document.getElementById('slide-7');
    if (!el) return;
    if (!('IntersectionObserver' in window)) { play(); return; }
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
    buildQuads();
    bindClicks();
    build();        // 초기 상태(숨김) 적용
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
    killAmbient();
    play();
  }

  return { init: init, replay: replay };
})();
