/* ============================================================
   slide-4.js — 슬라이드 4 (솔루션 · B-EMS → C-EMS) 애니메이션
   1막: 어둠 속 와이어프레임 건물 1채(B-EMS)가 홀로 회전하며 깜빡인다.
   발표자가 스페이스바(또는 →·PageDown)를 누르면 →
   2막: 카메라가 부감으로 줌아웃, 캠퍼스 군집이 펼쳐지고 "C-EMS"가 각인된다.
   전역 객체 AiceSlide4 { init, replay, advance } 노출
   ============================================================ */
window.AiceSlide4 = (function () {
  'use strict';

  var tlIntro, tlReveal;                          // 1막 · 2막 타임라인
  var played = false, revealed = false;
  var heroSpin, heroBlink, worldSpin, shimmer;    // 앰비언트 루프
  var heroBldg, campusBldgs = [], allBldgs = [];

  var ACT1_SCALE = 1.22, ACT2_SCALE = 0.62;  // 줌인(건물 1채) → 줌아웃(캠퍼스)
  var ACT1_TILT  = 8,    ACT2_TILT  = 52;    // 정면 → 부감
  var ACT1_LIFT  = 80;                       // 1막 — 건물을 아래로 내려 라벨 공간 확보

  var EDGE_DIM = 0.12, EDGE_LIT = 0.4, EDGE_HERO = 0.62;

  /* ----- 배경 파티클 (슬라이드 1·2·3 패턴) ----- */
  function makeParticles() {
    var pc = document.getElementById('s4-particles');
    if (!pc) return;
    for (var i = 0; i < 14; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top  = Math.random() * 100 + '%';
      pc.appendChild(p);
      gsap.set(p, { opacity: 0.05 + Math.random() * 0.16 });
      gsap.to(p, {
        y: -(70 + Math.random() * 150), opacity: 0,
        duration: 12 + Math.random() * 9, repeat: -1,
        delay: Math.random() * 11, ease: 'none'
      });
    }
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ----- 와이어프레임 건물 한 채 (CSS 3D 직육면체 · 5면) ----- */
  function face(cls, w, h, tf) {
    var f = document.createElement('div');
    f.className = 'face ' + cls;
    f.style.width  = w + 'px';
    f.style.height = h + 'px';
    f.style.transform = 'translate(-50%,-50%) ' + tf;
    return f;
  }
  function makeBuilding(w, d, h) {
    var bldg = document.createElement('div');
    bldg.className = 'bldg';
    var box = document.createElement('div');
    box.className = 'box';
    box.appendChild(face('side', w, h, 'translateZ(' + (d / 2) + 'px)'));
    box.appendChild(face('side', w, h, 'rotateY(180deg) translateZ(' + (d / 2) + 'px)'));
    box.appendChild(face('side', d, h, 'rotateY(90deg) translateZ('  + (w / 2) + 'px)'));
    box.appendChild(face('side', d, h, 'rotateY(-90deg) translateZ(' + (w / 2) + 'px)'));
    box.appendChild(face('top',  w, d, 'rotateX(90deg) translateZ('  + (h / 2) + 'px)'));
    bldg.appendChild(box);
    bldg._box = box;
    gsap.set(box, { y: -h / 2 });             // 밑면을 바닥(y=0)에 맞춤
    return bldg;
  }

  /* ----- 캠퍼스 배치 — 격자+지터, 히어로(B-EMS)는 원점 ----- */
  function buildCity() {
    var world = document.getElementById('s4-world');
    if (!world) return;
    world.innerHTML = '';
    campusBldgs = []; allBldgs = [];

    /* 히어로 — 모든 것의 출발점, 캠퍼스 원점에 선다 */
    heroBldg = makeBuilding(86, 86, 234);
    gsap.set(heroBldg, { x: 0, z: 0 });
    world.appendChild(heroBldg);
    allBldgs.push(heroBldg);

    /* 캠퍼스 — 8×4 격자(넓고 얕게)에서 빈칸을 남기고 지터 */
    var SP = 116, cells = [];
    for (var c = 0; c < 8; c++) {
      for (var r = 0; r < 4; r++) {
        var cx = (c - 3.5) * SP, cz = (r - 1.5) * SP;
        if (Math.abs(cx) < 72 && Math.abs(cz) < 72) continue;   // 원점 = 히어로 자리
        cells.push({ x: cx, z: cz });
      }
    }
    shuffle(cells);
    var COUNT = Math.min(24, cells.length);
    for (var i = 0; i < COUNT; i++) {
      var b = makeBuilding(rnd(46, 80), rnd(46, 80), rnd(80, 200));
      gsap.set(b, {
        x: cells[i].x + rnd(-24, 24),
        z: cells[i].z + rnd(-24, 24),
        scale: 0
      });
      world.appendChild(b);
      campusBldgs.push(b);
      allBldgs.push(b);
    }
  }

  /* ----- 타임라인 (1막 · 2막) ----- */
  function build() {
    var world = document.getElementById('s4-world');
    var spot  = document.querySelector('#slide-4 .bg-spot');
    var ems   = document.getElementById('s4-ems');
    var chB   = document.querySelector('#slide-4 .ch-b');
    var chC   = document.querySelector('#slide-4 .ch-c');
    var sub   = document.querySelector('#slide-4 .cems-sub');
    if (!world || !heroBldg || !ems) return;
    if (tlIntro)  tlIntro.kill();
    if (tlReveal) tlReveal.kill();
    killAmbient();

    var EMS_OFF  = 'drop-shadow(0 0 0px rgba(255,255,255,0))';
    var EMS_GLOW = 'drop-shadow(0 0 24px rgba(255,255,255,0.45))';

    /* ----- 초기 상태 (1막 · 줌인) ----- */
    gsap.set(spot, { opacity: 0 });
    gsap.set(world, { rotationX: ACT1_TILT, rotationY: 0, scale: ACT1_SCALE, y: ACT1_LIFT });
    gsap.set(heroBldg, { scale: 0.5, '--edge': 0.1, '--glow': 0 });
    gsap.set(campusBldgs, { scale: 0, '--edge': EDGE_DIM, '--glow': 0 });
    gsap.set(ems, { xPercent: -50, scale: 0.42, y: 23, opacity: 0, filter: EMS_OFF });
    gsap.set(chB, { opacity: 1, y: 0 });
    gsap.set(chC, { opacity: 0, y: 16 });
    gsap.set(sub, { xPercent: -50, opacity: 0, y: 14 });

    /* ===== 1막 — 등장 (슬라이드 진입 시 자동 재생) ===== */
    tlIntro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    tlIntro.to(spot, { opacity: 0.85, duration: 1.6, ease: 'power2.out' }, 0);
    tlIntro.to(heroBldg, { scale: 1, duration: 1.5, ease: 'expo.out' }, 0);
    tlIntro.to(heroBldg, { '--edge': EDGE_HERO, duration: 1.3, ease: 'power2.out' }, 0.1);
    tlIntro.to(ems, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 0.55);
    /* 1막이 끝나면 건물은 계속 회전·깜빡이며(앰비언트) 발표자 입력을 기다린다 */

    /* ===== 2막 — 줌아웃 → C-EMS (advance()로 재생) ===== */
    tlReveal = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' },
                               onStart: onRevealStart });

    /* 줌아웃 — 카메라가 하늘로, 캠퍼스가 펼쳐진다 */
    tlReveal.to(world, { rotationX: ACT2_TILT, scale: ACT2_SCALE, y: 70,
                         duration: 2.7, ease: 'power3.inOut' }, 0);
    tlReveal.to(campusBldgs, { scale: 1, duration: 1.15, ease: 'power3.out',
                               stagger: { each: 0.05, from: 'random' } }, 0.4);
    /* 라벨이 헤드라인으로 떠올라 커진다 */
    tlReveal.to(ems, { scale: 1, y: 0, duration: 2.1, ease: 'power3.inOut' }, 0.3);

    /* B → C 변신 */
    tlReveal.addLabel('morph', 1.75);
    tlReveal.to(chB, { opacity: 0, y: -18, duration: 0.55, ease: 'power2.in' }, 'morph');
    tlReveal.to(chC, { opacity: 1, y: 0,   duration: 0.7,  ease: 'power3.out' }, 'morph+=0.05');

    /* C-EMS 각인 — 캠퍼스 전체가 켜진다 */
    tlReveal.addLabel('cems', 2.5);
    tlReveal.to(ems, { filter: EMS_GLOW, duration: 1.0, ease: 'power2.out' }, 'cems');
    tlReveal.to(sub, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 'cems+=0.15');
    tlReveal.to(campusBldgs, { '--edge': EDGE_LIT, duration: 1.0, ease: 'power2.out',
                               stagger: { each: 0.04, from: 'random' } }, 'cems');
    tlReveal.to(allBldgs, { '--glow': 0.3, duration: 0.5, ease: 'sine.out',
                            yoyo: true, repeat: 1,
                            stagger: { each: 0.045, from: 'random' } }, 'cems+=0.1');
    tlReveal.call(startWorldSpin, null, 'cems');
    tlReveal.call(startShimmer, null, 'cems+=2.0');
  }

  /* ----- 앰비언트 루프 ----- */
  function startHeroSpin() {
    stopHeroSpin();
    if (heroBldg) heroSpin = gsap.to(heroBldg._box, {
      rotationY: '+=360', duration: 13, repeat: -1, ease: 'none'
    });
  }
  function stopHeroSpin() { if (heroSpin) { heroSpin.kill(); heroSpin = null; } }

  /* 1막 대기 중 건물의 깜빡임 — 모니터링되는 건물의 심박 */
  function startHeroBlink() {
    stopHeroBlink();
    if (heroBldg) heroBlink = gsap.to(heroBldg, {
      '--glow': 0.24, duration: 0.95, ease: 'sine.inOut', repeat: -1, yoyo: true
    });
  }
  function stopHeroBlink() {
    if (heroBlink) { heroBlink.kill(); heroBlink = null; }
    if (heroBldg) gsap.set(heroBldg, { '--glow': 0 });
  }

  function startWorldSpin() {
    var world = document.getElementById('s4-world');
    if (worldSpin) worldSpin.kill();
    if (world) worldSpin = gsap.to(world, {
      rotationY: '-=360', duration: 90, repeat: -1, ease: 'none'
    });
  }
  function startShimmer() {
    if (shimmer) shimmer.kill();
    if (campusBldgs.length) shimmer = gsap.to(campusBldgs, {
      '--edge': 0.47, duration: 2.0, ease: 'sine.inOut',
      repeat: -1, yoyo: true, stagger: { each: 0.16, from: 'random' }
    });
  }

  /* 2막 시작 — 1막 앰비언트(회전·깜빡임)를 멈춘다 */
  function onRevealStart() {
    stopHeroSpin();
    stopHeroBlink();
  }

  function killAmbient() {
    stopHeroSpin();
    stopHeroBlink();
    if (worldSpin) { worldSpin.kill(); worldSpin = null; }
    if (shimmer)   { shimmer.kill();   shimmer = null; }
  }

  /* ----- 재생 제어 ----- */
  /* 슬라이드 진입 시 — 1막 자동 재생 후 발표자 입력 대기 */
  function play() {
    if (!tlIntro || played) return;
    played = true;
    revealed = false;
    tlIntro.play(0);
    startHeroSpin();
    startHeroBlink();
  }

  /* 발표자 입력(스페이스바 등) — 1막 대기 중이면 2막을 재생하고
     true(입력 소비)를 반환한다. 더 진행할 단계가 없으면 false. */
  function advance() {
    if (!played || revealed) return false;
    revealed = true;
    if (tlIntro.progress() < 1) tlIntro.progress(1);   // 1막 재생 중이면 즉시 완료
    tlReveal.play(0);
    return true;
  }

  /* ----- 뷰포트 진입 시 1막 자동 재생 ----- */
  function observe() {
    var el = document.getElementById('slide-4');
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
    buildCity();
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
    revealed = false;
    killAmbient();
    buildCity();
    build();
    play();
  }

  return { init: init, replay: replay, advance: advance };
})();
