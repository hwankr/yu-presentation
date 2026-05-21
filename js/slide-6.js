/* ============================================================
   slide-6.js — 슬라이드 6 (현장 적용 · Before → After 전환)
   학교 시설팀 인터뷰로 검증한 활용 효과가 자동 재생된다.
   eyebrow → 인터뷰 출처 앵커 → 전환 행(현재 윤곽선 → 화살표
   드로잉 → Campus-EMS 솔리드 점화) → 향후 방향 밴드 → 킥커.
   끝까지 남는 키워드는 "운영".
   전역 객체 AiceSlide6 { init, replay } 노출
   ============================================================ */
window.AiceSlide6 = (function () {
  'use strict';

  /* ----- 전환 행 (편집 가능) — 현재 방식 → Campus-EMS 적용 ----- */
  var ROWS = [
    {
      cat: '공용 전자기기 운영',
      now: { main: '기온 30°C 이상 · 3일 연속', sub: '고정된 가동 기준 — 잦은 민원' },
      ems: { main: '상황을 읽는 유연한 운영',    sub: '합리적인 공용기기 제어' }
    },
    {
      cat: '피크 전력 관리',
      now: { main: '건물별 순환 전원 차단',      sub: '일괄적이고 단순한 차단 방식' },
      ems: { main: '예측 기반 정교한 제어',      sub: '전력 사용량 예측으로 제어 로직 설계' }
    }
  ];

  /* ----- 향후 방향 단계 (편집 가능) ----- */
  var FUTURE = [
    { n: '01', title: '학생에게 대시보드 공개', sub: '시설팀 전용 → 모두에게' },
    { n: '02', title: '건물별 사용량 비교',     sub: '선의의 경쟁을 유도' },
    { n: '03', title: '인센티브로 능동적 절감', sub: '스스로 줄이는 캠퍼스' }
  ];

  /* ----- 타임라인 비트 (초, 편집 가능) ----- */
  var ROW_AT    = [1.15, 2.7];   // 각 전환 행 등장 시점
  var FUTURE_AT = 4.5;           // 향후 방향 밴드 등장
  var KICK_AT   = 6.05;          // 마무리 킥커

  var tl;
  var played = false;
  var ambient = [];

  /* ============================================================
     배경 입자
     ============================================================ */
  function makeParticles() {
    var pc = document.getElementById('s6-particles');
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
     전환 행 DOM 생성 — ROWS 배열로 현재·Campus-EMS 카드를 채운다
     ============================================================ */
  function buildRows() {
    var host = document.getElementById('s6-rows');
    if (!host) return;
    host.innerHTML = '';
    for (var i = 0; i < ROWS.length; i++) {
      var r = ROWS[i];
      var row = document.createElement('div');
      row.className = 'row';
      row.innerHTML =
        '<span class="row-cat">' + r.cat + '</span>' +
        '<div class="row-body">' +
          '<div class="card card-now">' +
            '<span class="card-tag">현재</span>' +
            '<strong class="card-main">' + r.now.main + '</strong>' +
            '<span class="card-sub">' + r.now.sub + '</span>' +
          '</div>' +
          '<svg class="row-arrow" viewBox="0 0 96 28" aria-hidden="true">' +
            '<path class="arrow-path" d="M 8,14 L 82,14 L 70,7 L 82,14 L 70,21"/>' +
          '</svg>' +
          '<div class="card card-ems">' +
            '<span class="card-tag">Campus-EMS 적용</span>' +
            '<strong class="card-main">' + r.ems.main + '</strong>' +
            '<span class="card-sub">' + r.ems.sub + '</span>' +
          '</div>' +
        '</div>';
      host.appendChild(row);
    }
  }

  /* ============================================================
     향후 방향 밴드 DOM 생성 — FUTURE 배열로 단계를 채운다
     ============================================================ */
  function buildFuture() {
    var host = document.getElementById('s6-future-track');
    if (!host) return;
    host.innerHTML = '';
    for (var i = 0; i < FUTURE.length; i++) {
      if (i > 0) {
        var sep = document.createElement('span');
        sep.className = 'fsep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '▸';
        host.appendChild(sep);
      }
      var f = FUTURE[i];
      var step = document.createElement('div');
      step.className = 'fstep';
      step.innerHTML =
        '<span class="fnum">' + f.n + '</span>' +
        '<div class="ftext">' +
          '<strong class="ftitle">' + f.title + '</strong>' +
          '<span class="fsub">' + f.sub + '</span>' +
        '</div>';
      host.appendChild(step);
    }
  }

  /* ============================================================
     타임라인
     ============================================================ */
  function build() {
    var eyebrow     = document.getElementById('s6-eyebrow');
    var spot        = document.querySelector('#slide-6 .bg-spot');
    var credLine    = document.querySelector('#s6-cred .cred-line');
    var credSub     = document.querySelector('#s6-cred .cred-sub');
    var rows        = document.querySelectorAll('#s6-rows .row');
    var future      = document.getElementById('s6-future');
    var futureLabel = document.querySelector('#s6-future .future-label');
    var fsteps      = document.querySelectorAll('#s6-future .fstep');
    var fseps       = document.querySelectorAll('#s6-future .fsep');
    var kicker      = document.getElementById('s6-kicker');
    var kw          = document.querySelector('#slide-6 .kicker .kw');
    if (!rows.length || !future) return;

    if (tl) tl.kill();
    killAmbient();

    /* ----- 초기 상태 ----- */
    gsap.set(spot, { opacity: 0.5 });
    gsap.set(eyebrow, { opacity: 0, y: -8 });
    gsap.set(credLine, { opacity: 0, y: 8 });
    gsap.set(credSub, { opacity: 0 });
    gsap.set(future, { opacity: 0, y: 14 });
    gsap.set(futureLabel, { opacity: 0 });
    gsap.set(fsteps, { opacity: 0, y: 10 });
    gsap.set(fseps, { opacity: 0, scale: 0.5 });
    gsap.set(kicker, { opacity: 0, y: 10 });
    gsap.set(kw, { filter: 'drop-shadow(0 0 0px rgba(255,255,255,0))' });

    var i;
    for (i = 0; i < rows.length; i++) {
      var cat   = rows[i].querySelector('.row-cat');
      var now   = rows[i].querySelector('.card-now');
      var ems   = rows[i].querySelector('.card-ems');
      var arrow = rows[i].querySelector('.arrow-path');
      gsap.set(cat, { opacity: 0, y: -6 });
      gsap.set(now, { opacity: 0, y: 12 });
      gsap.set(ems, { opacity: 0, y: 12, '--emsglow': 0 });
      var len = arrow.getTotalLength ? arrow.getTotalLength() : 116;
      gsap.set(arrow, { strokeDasharray: len, strokeDashoffset: len });
    }

    /* ----- 타임라인 ----- */
    tl = gsap.timeline({
      paused: true,
      defaults: { ease: 'power3.out' },
      onComplete: startAmbient
    });

    /* 1) eyebrow */
    tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.7 }, 0);

    /* 2) 인터뷰 출처 앵커 — 현장 검증의 신뢰 도장 */
    tl.to(credLine, { opacity: 1, y: 0, duration: 0.7 }, 0.35);
    tl.to(credSub, { opacity: 1, duration: 0.6 }, 0.72);

    /* 3) 전환 행 — 현재(윤곽선) → 화살표 → Campus-EMS(솔리드 점화) */
    for (i = 0; i < rows.length; i++) {
      revealRow(tl, rows[i], ROW_AT[i]);
    }

    /* 4) 향후 방향 밴드 — 3단계 좌→우 캐스케이드 */
    tl.to(future, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, FUTURE_AT);
    tl.to(futureLabel, { opacity: 1, duration: 0.45 }, FUTURE_AT + 0.15);
    tl.to(fsteps, { opacity: 1, y: 0, duration: 0.55, stagger: 0.34 }, FUTURE_AT + 0.32);
    tl.to(fseps, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.34 }, FUTURE_AT + 0.5);

    /* 5) 마무리 킥커 — "운영" 솔리드 강조 */
    tl.to(kicker, { opacity: 1, y: 0, duration: 0.85 }, KICK_AT);
    tl.to(kw, {
      filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.42))',
      duration: 0.9, ease: 'power2.out'
    }, KICK_AT + 0.15);

    return tl;
  }

  /* 전환 행 한 줄 — 행 라벨 → 현재 카드 → 화살표 드로잉 → Campus-EMS 점화 */
  function revealRow(timeline, row, at) {
    var cat   = row.querySelector('.row-cat');
    var now   = row.querySelector('.card-now');
    var ems   = row.querySelector('.card-ems');
    var arrow = row.querySelector('.arrow-path');

    timeline.to(cat, { opacity: 1, y: 0, duration: 0.5 }, at);
    timeline.to(now, { opacity: 1, y: 0, duration: 0.62 }, at + 0.16);
    timeline.to(arrow, {
      strokeDashoffset: 0, duration: 0.55, ease: 'power2.inOut'
    }, at + 0.6);
    timeline.to(ems, { opacity: 1, y: 0, duration: 0.62 }, at + 1.02);
    /* 솔리드 점화 — 글로우 섬광 후 은은하게 안정 */
    timeline.to(ems, { '--emsglow': 0.85, duration: 0.32, ease: 'power2.out' }, at + 1.12);
    timeline.to(ems, { '--emsglow': 0.3,  duration: 0.7,  ease: 'power2.out' }, at + 1.44);
  }

  /* ============================================================
     앰비언트 모션 — 재생 종료 후 Campus-EMS 카드가 은은히 호흡
     ============================================================ */
  function startAmbient() {
    killAmbient();
    var emsCards = document.querySelectorAll('#s6-rows .card-ems');
    if (emsCards.length) {
      ambient.push(gsap.to(emsCards, {
        '--emsglow': 0.14,
        duration: 2.2, ease: 'sine.inOut',
        yoyo: true, repeat: -1,
        stagger: { each: 0.6, from: 'start' }
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
    if (tl) tl.play(0);
  }

  function observe() {
    var el = document.getElementById('slide-6');
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
    buildRows();
    buildFuture();
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
