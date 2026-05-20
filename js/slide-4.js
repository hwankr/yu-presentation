/* ============================================================
   slide-4.js — 슬라이드 4 (솔루션 · B-EMS → C-EMS) 애니메이션
   정사영(orthographic) 아이소메트릭 — perspective 없음 →
   건물 수직 모서리가 항상 화면 수직선. 절대 기울어 보이지 않는다.
   1막: 단일 건물(B-EMS) + 관제 콘솔 HUD가 자동 등장.
   발표자가 스페이스바(또는 →·PageDown)를 누르면 →
   2막: 부감 줌아웃, 캠퍼스 군집 + 네트워크 연결선이 펼쳐지고 "C-EMS" 각인.
   전역 객체 AiceSlide4 { init, replay, advance } 노출
   ============================================================ */
window.AiceSlide4 = (function () {
  'use strict';

  /* ----- 카메라 (정사영 아이소메트릭) -----
     회전(rotateX 26° → rotateY -25°)은 css `.tilt` 가 고정으로 갖는다.
     GSAP은 `.world` 에 스케일·세로이동만 적용 → 수직 모서리가 절대 안 기운다. */
  var ACT1_SCALE = 1.42, ACT1_Y = 56;
  var ACT2_SCALE = 0.6, ACT2_Y = 64;

  /* ----- 건물 ----- */
  var HERO_W = 116, HERO_D = 116, HERO_H = 310;
  var EDGE_DIM = 0.12, EDGE_LIT = 0.42, EDGE_HERO = 0.6;

  var tlIntro, tlReveal;
  var played = false, revealed = false;
  var heroBlink, heroPulseTw, winFlickerTw, shimmer, netFlowTw, coreRingTws = [];
  var heroBldg, campusBldgs = [], allBldgs = [];
  var floorEl, gglowEl, netCoreEl, netLines = [], netDots = [];
  var campusLights = [], coreRings = [];

  /* ============================================================
     입자 배경
     ============================================================ */
  function makeParticles() {
    var pc = document.getElementById('s4-particles');
    if (!pc) return;
    for (var i = 0; i < 16; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
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

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ============================================================
     3D 건물 — 5면 직육면체
     ============================================================ */
  function face(cls, w, h, tf) {
    var f = document.createElement('div');
    f.className = 'face ' + cls;
    f.style.width = w + 'px';
    f.style.height = h + 'px';
    f.style.transform = 'translate(-50%,-50%) ' + tf;
    return f;
  }

  /* 히어로 건물 전용 — 면에 DOM 창문 격자를 깐다 */
  function makeWindowGrid(faceEl, w, h) {
    faceEl.classList.add('windowed');
    var layer = document.createElement('div');
    layer.className = 'windows';
    var cols = Math.max(3, Math.round(w / 17));
    var rows = Math.max(6, Math.round(h / 19));
    layer.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
    layer.style.gridTemplateRows = 'repeat(' + rows + ',1fr)';
    var lit = [];
    for (var i = 0; i < cols * rows; i++) {
      var win = document.createElement('div');
      if (Math.random() < 0.4) {
        win.className = 'win lit';
        lit.push(win);
      } else {
        win.className = 'win';
      }
      layer.appendChild(win);
    }
    faceEl.appendChild(layer);
    return { layer: layer, lit: lit };
  }

  /* 캠퍼스 건물 — 면에 점등 창문 몇 개를 흩뿌린다 (도시가 살아있는 느낌) */
  function addCampusLights(faceEl, w, h) {
    var lights = [];
    var cols = Math.max(2, Math.round(w / 15));
    var rows = Math.max(3, Math.round(h / 16));
    var cellW = (w - 10) / cols;
    var cellH = (h - 10) / rows;
    var n = 2 + Math.floor(Math.random() * 4);
    var used = {}, tries = 0;
    while (lights.length < n && tries < 28) {
      tries++;
      var c = Math.floor(Math.random() * cols);
      var r = Math.floor(Math.random() * rows);
      var key = c + ',' + r;
      if (used[key]) continue;
      used[key] = 1;
      var cell = document.createElement('div');
      cell.className = 'clit';
      cell.style.left = (5 + c * cellW + cellW * 0.2) + 'px';
      cell.style.top = (5 + r * cellH + cellH * 0.2) + 'px';
      cell.style.width = (cellW * 0.6) + 'px';
      cell.style.height = (cellH * 0.58) + 'px';
      faceEl.appendChild(cell);
      lights.push(cell);
    }
    return lights;
  }

  /* C-EMS 코어에서 퍼지는 펄스 링 (바닥 평면) */
  function makeCoreRings(tilt) {
    coreRings = [];
    for (var i = 0; i < 3; i++) {
      var ring = document.createElement('div');
      ring.className = 'corering';
      tilt.appendChild(ring);
      coreRings.push(ring);
    }
  }

  /* 히어로 건물 옥상 — HVAC 유닛 미니 박스 */
  function addRooftop(bldg, w, d, h) {
    var defs = [
      { s: w * 0.34, mh: 26, ox: -w * 0.15, oz: -d * 0.13 },
      { s: w * 0.2,  mh: 16, ox:  w * 0.22, oz:  d * 0.19 }
    ];
    for (var i = 0; i < defs.length; i++) {
      var u = defs[i];
      var mini = makeBuilding(u.s, u.s, u.mh, { mini: true });
      gsap.set(mini, { x: u.ox, y: -h, z: u.oz });
      bldg.appendChild(mini);
    }
  }

  /* 히어로 건물 정면 — 바닥에서 옥상으로 흐르는 에너지 펄스 */
  function addPulse(faceEl, h) {
    var pulse = document.createElement('div');
    pulse.className = 'epulse';
    pulse.style.height = (h * 0.26) + 'px';
    faceEl.appendChild(pulse);
    return pulse;
  }

  function makeBuilding(w, d, h, opts) {
    opts = opts || {};
    var bldg = document.createElement('div');
    var box = document.createElement('div');
    bldg.className = 'bldg';
    box.className = 'box';

    var fFront = face('front side', w, h, 'translateZ(' + (d / 2) + 'px)');
    var fBack  = face('back side',  w, h, 'rotateY(180deg) translateZ(' + (d / 2) + 'px)');
    var fRight = face('right side', d, h, 'rotateY(90deg) translateZ(' + (w / 2) + 'px)');
    var fLeft  = face('left side',  d, h, 'rotateY(-90deg) translateZ(' + (w / 2) + 'px)');
    var fTop   = face('top',        w, d, 'rotateX(90deg) translateZ(' + (h / 2) + 'px)');

    if (opts.hero) {
      var gF = makeWindowGrid(fFront, w, h);
      var gR = makeWindowGrid(fRight, d, h);
      bldg._windows = gF.lit.concat(gR.lit);
    } else if (!opts.mini) {
      bldg._lights = addCampusLights(fFront, w, h).concat(addCampusLights(fRight, d, h));
    }

    box.appendChild(fFront); box.appendChild(fBack);
    box.appendChild(fRight); box.appendChild(fLeft);
    box.appendChild(fTop);
    bldg.appendChild(box);
    bldg._box = box;
    gsap.set(box, { y: -h / 2 });

    if (opts.hero) {
      addRooftop(bldg, w, d, h);
      bldg._pulse = addPulse(fFront, h);
    }
    return bldg;
  }

  /* ============================================================
     바닥 · 글로우 · 네트워크
     ============================================================ */
  function makeFloor() {
    var floor = document.createElement('div');
    floor.className = 'floor';
    floor.style.width = '1660px';
    floor.style.height = '1200px';
    return floor;
  }

  function makeGroundGlow() {
    var g = document.createElement('div');
    g.className = 'gglow';
    g.style.width = '470px';
    g.style.height = '470px';
    return g;
  }

  /* 캠퍼스 건물 → 중심 코어로 가는 연결선 (바닥 평면 위) */
  function makeNetwork(world) {
    netLines = []; netDots = [];
    for (var i = 0; i < campusBldgs.length; i++) {
      var b = campusBldgs[i];
      var bx = b._x, bz = b._z;
      var L = Math.sqrt(bx * bx + bz * bz);
      if (L < 40) continue;
      var phi = Math.atan2(-bz, bx) * 180 / Math.PI;
      var line = document.createElement('div');
      line.className = 'netline';
      line.style.width = L + 'px';
      line.style.transform = 'rotateY(' + phi + 'deg) rotateX(90deg)';
      var dot = document.createElement('div');
      dot.className = 'netdot';
      line.appendChild(dot);
      world.appendChild(line);
      netLines.push(line);
      netDots.push(dot);
    }
  }

  function buildCity() {
    var tilt = document.getElementById('s4-tilt');
    if (!tilt) return;
    tilt.innerHTML = '';
    campusBldgs = []; allBldgs = []; netLines = []; netDots = [];
    campusLights = []; coreRings = [];

    floorEl = makeFloor();
    tilt.appendChild(floorEl);
    gglowEl = makeGroundGlow();
    tilt.appendChild(gglowEl);

    heroBldg = makeBuilding(HERO_W, HERO_D, HERO_H, { hero: true });
    heroBldg._x = 0; heroBldg._z = 0;
    gsap.set(heroBldg, { x: 0, z: 0 });
    tilt.appendChild(heroBldg);
    allBldgs.push(heroBldg);

    /* 격자를 기준점으로 잡되 강한 지터로 흩뿌려 — 실제 캠퍼스처럼 불규칙하게.
       셀 수보다 적게 골라 빈터(gap)도 생긴다. */
    var SP = 128, cells = [];
    for (var c = 0; c < 9; c++) {
      for (var r = 0; r < 4; r++) {
        var cx = (c - 4) * SP;
        var cz = (r - 1.5) * SP;
        if (Math.abs(cx) < 138 && Math.abs(cz) < 124) continue;
        cells.push({ x: cx, z: cz });
      }
    }
    shuffle(cells);
    var count = Math.min(24, cells.length);
    for (var i = 0; i < count; i++) {
      var size = rnd(54, 96);
      var b = makeBuilding(size, size, rnd(64, 184), {});
      var bx = cells[i].x + rnd(-46, 46);
      var bz = cells[i].z + rnd(-46, 46);
      b._x = bx; b._z = bz;
      gsap.set(b, { x: bx, z: bz, scale: 0, '--fill': rnd(0.1, 0.18) });
      tilt.appendChild(b);
      campusBldgs.push(b);
      allBldgs.push(b);
      if (b._lights) campusLights = campusLights.concat(b._lights);
    }

    netCoreEl = document.createElement('div');
    netCoreEl.className = 'netcore';
    tilt.appendChild(netCoreEl);
    makeNetwork(tilt);
    makeCoreRings(tilt);
  }

  /* ============================================================
     스파크라인 (오늘 부하 곡선)
     ============================================================ */
  function buildSpark() {
    var data = [0.22, 0.18, 0.16, 0.15, 0.17, 0.25, 0.42, 0.63,
                0.78, 0.73, 0.69, 0.82, 0.93, 1.0, 0.85, 0.71,
                0.67, 0.74, 0.83, 0.78, 0.6, 0.45, 0.33, 0.25];
    var W = 240, H = 66, pad = 7, n = data.length, pts = [];
    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * W;
      var y = H - pad - data[i] * (H - pad * 2);
      pts.push([x, y]);
    }
    var line = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (var j = 1; j < n; j++) {
      line += ' L' + pts[j][0].toFixed(1) + ',' + pts[j][1].toFixed(1);
    }
    var area = line + ' L' + W + ',' + H + ' L0,' + H + ' Z';
    var pk = 0;
    for (var k = 0; k < n; k++) if (data[k] > data[pk]) pk = k;
    return { line: line, area: area, peak: pts[pk] };
  }

  /* 타임라인에 숫자 카운트업을 추가 */
  function addCount(tl, el, pos) {
    if (!el) return;
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var isInt = el.getAttribute('data-int') === '1';
    var p = { v: 0 };
    el.textContent = (isInt ? '0' : '0.0') + suffix;
    tl.to(p, {
      v: target, duration: 1.3, ease: 'power2.out',
      onUpdate: function () {
        var n = isInt
          ? Math.round(p.v).toLocaleString('en-US')
          : p.v.toFixed(1);
        el.textContent = n + suffix;
      }
    }, pos);
  }

  /* ============================================================
     타임라인 구성
     ============================================================ */
  function build() {
    var world = document.getElementById('s4-world');
    var spot = document.querySelector('#slide-4 .bg-spot');
    var ems = document.getElementById('s4-ems');
    var kicker = document.getElementById('s4-bems-kicker');
    var sub = document.getElementById('s4-cems-sub');
    var stats = document.getElementById('s4-cems-stats');
    var buildingHud = document.getElementById('s4-building-hud');
    var panelL = document.querySelector('#slide-4 .panel-left');
    var panelR = document.querySelector('#slide-4 .panel-right');
    var profile = document.querySelector('#slide-4 .building-profile');
    var calloutDot = document.querySelector('#slide-4 .callout-dot');
    var calloutLine = document.querySelector('#slide-4 .callout-line');
    var calloutLabel = document.querySelector('#slide-4 .callout-label');
    var panelItems = document.querySelectorAll(
      '#slide-4 .panel-tag, #slide-4 .stat, #slide-4 .spark, #slide-4 .load-row, #slide-4 .gauge');
    var loadBars = document.querySelectorAll('#slide-4 .load-track i');
    var statVals = document.querySelectorAll('#slide-4 .stat-val');
    var gaugeNum = document.querySelector('#slide-4 .gauge-num');
    var sparkLine = document.querySelector('#slide-4 .spark-line');
    var sparkArea = document.querySelector('#slide-4 .spark-area');
    var sparkDot = document.querySelector('#slide-4 .spark-dot');
    var gaugeFill = document.querySelector('#slide-4 .gauge-fill');
    var chB = document.querySelector('#slide-4 .ch-b');
    var chC = document.querySelector('#slide-4 .ch-c');
    if (!world || !heroBldg || !ems) return;

    if (tlIntro) tlIntro.kill();
    if (tlReveal) tlReveal.kill();
    killAmbient();

    var emsOff = 'drop-shadow(0 0 0px rgba(255,255,255,0))';
    var emsGlow = 'drop-shadow(0 0 26px rgba(255,255,255,0.45))';

    /* 뷰포트 폭에 비례한 스케일 — 어느 발표 해상도에서도 일관 */
    var k = Math.min(1.5, Math.max(0.55, window.innerWidth / 1280));
    var act1Scale = ACT1_SCALE * k, act1Y = ACT1_Y * k;
    var act2Scale = ACT2_SCALE * k, act2Y = ACT2_Y * k;

    /* 스파크라인 그리기 */
    var slen = 0;
    if (sparkLine && sparkArea && sparkDot) {
      var sp = buildSpark();
      sparkLine.setAttribute('d', sp.line);
      sparkArea.setAttribute('d', sp.area);
      sparkDot.setAttribute('cx', sp.peak[0].toFixed(1));
      sparkDot.setAttribute('cy', sp.peak[1].toFixed(1));
      slen = sparkLine.getTotalLength ? sparkLine.getTotalLength() : 320;
    }
    /* 게이지 호 길이 */
    var glen = gaugeFill && gaugeFill.getTotalLength
      ? gaugeFill.getTotalLength() : 157;
    var gPct = 0.87;

    var heroWindows = heroBldg._windows || [];
    var heroPulse = heroBldg._pulse;

    /* ----- 초기 상태 ----- */
    gsap.set(spot, { opacity: 0 });
    gsap.set(world, { scale: act1Scale, y: act1Y });
    gsap.set(heroBldg, { scale: 0.52, '--edge': 0.1, '--glow': 0, '--fill': 0.14 });
    gsap.set(campusBldgs, { scale: 0, '--edge': EDGE_DIM, '--glow': 0 });
    gsap.set(floorEl, { opacity: 0 });
    gsap.set(gglowEl, { opacity: 0 });
    gsap.set(netCoreEl, { opacity: 0, scale: 0.4 });
    if (netLines.length) gsap.set(netLines, { opacity: 0 });
    if (netDots.length) gsap.set(netDots, { opacity: 0 });
    if (campusLights.length) gsap.set(campusLights, { opacity: 0 });
    if (coreRings.length) gsap.set(coreRings, { opacity: 0, scale: 0.12 });
    if (heroWindows.length) gsap.set(heroWindows, { opacity: 0 });
    if (heroPulse) gsap.set(heroPulse, { opacity: 0, y: 0 });

    gsap.set(ems, { xPercent: -50, scale: 0.56, y: -6, opacity: 0, filter: emsOff });
    gsap.set(kicker, { opacity: 0, y: 10 });
    gsap.set(sub, { opacity: 0, y: 12 });
    gsap.set(stats, { opacity: 0, y: 12 });
    gsap.set(buildingHud, { opacity: 1 });
    gsap.set(panelL, { opacity: 0, x: -28 });
    gsap.set(panelR, { opacity: 0, x: 28 });
    gsap.set(profile, { opacity: 0, y: 20 });
    gsap.set(calloutDot, { scale: 0, opacity: 0, transformOrigin: '50% 50%' });
    gsap.set(calloutLine, { scaleX: 0, transformOrigin: '100% 50%' });
    gsap.set(calloutLabel, { opacity: 0, x: 12 });
    gsap.set(panelItems, { opacity: 0, y: 9 });
    gsap.set(loadBars, { scaleX: 0, transformOrigin: '0% 50%' });
    gsap.set(chB, { opacity: 1, y: 0 });
    gsap.set(chC, { opacity: 0, y: 16 });
    if (sparkLine) gsap.set(sparkLine, { strokeDasharray: slen, strokeDashoffset: slen });
    if (sparkArea) gsap.set(sparkArea, { opacity: 0 });
    if (sparkDot) gsap.set(sparkDot, { opacity: 0, scale: 0, transformOrigin: '50% 50%' });
    if (gaugeFill) gsap.set(gaugeFill, { strokeDasharray: glen, strokeDashoffset: glen });

    /* ----- 1막 — 단일 건물 관제 화면 ----- */
    tlIntro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    tlIntro.to(spot, { opacity: 0.9, duration: 1.6, ease: 'power2.out' }, 0);
    tlIntro.to(floorEl, { opacity: 0.6, duration: 1.5, ease: 'power2.out' }, 0);
    tlIntro.to(gglowEl, { opacity: 1, duration: 1.5, ease: 'power2.out' }, 0.1);
    tlIntro.to(heroBldg, { scale: 1, duration: 1.5, ease: 'expo.out' }, 0);
    tlIntro.to(heroBldg, { '--edge': EDGE_HERO, duration: 1.3, ease: 'power2.out' }, 0.15);
    if (heroWindows.length) {
      tlIntro.to(heroWindows, {
        opacity: 1, duration: 0.5, ease: 'power1.out',
        stagger: { each: 0.03, from: 'random' }
      }, 0.55);
    }
    tlIntro.to(ems, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 0.55);
    tlIntro.to(kicker, { opacity: 1, y: 0, duration: 0.7 }, 0.7);
    tlIntro.to(panelL, { opacity: 1, x: 0, duration: 0.8 }, 0.85);
    tlIntro.to(panelR, { opacity: 1, x: 0, duration: 0.8 }, 0.95);
    tlIntro.to(profile, { opacity: 1, y: 0, duration: 0.75 }, 1.05);
    tlIntro.to(panelItems, {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.05
    }, 1.05);
    addCount(tlIntro, statVals[0], 1.2);
    addCount(tlIntro, statVals[1], 1.32);
    tlIntro.to(loadBars, {
      scaleX: 1, duration: 0.9, ease: 'power2.out', stagger: 0.08
    }, 1.35);
    if (sparkArea) tlIntro.to(sparkArea, { opacity: 1, duration: 0.8 }, 1.5);
    if (sparkLine) tlIntro.to(sparkLine, { strokeDashoffset: 0, duration: 1.15, ease: 'power2.out' }, 1.45);
    if (sparkDot) tlIntro.to(sparkDot, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, 2.35);
    if (gaugeFill) tlIntro.to(gaugeFill, { strokeDashoffset: glen * (1 - gPct), duration: 1.2, ease: 'power2.out' }, 1.6);
    addCount(tlIntro, gaugeNum, 1.6);
    tlIntro.call(startAmbient, null, 2.0);

    /* 콜아웃 — 빌딩에서 노드·리더 선이 끌어나오고 라벨이 뜬다 */
    tlIntro.to(calloutDot, { scale: 1, opacity: 1, duration: 0.45, ease: 'power3.out' }, 2.55);
    tlIntro.to(calloutLine, { scaleX: 1, duration: 0.55, ease: 'power2.out' }, 2.7);
    tlIntro.to(calloutLabel, { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' }, 3.0);

    /* ----- 2막 — 부감 줌아웃 → 캠퍼스 C-EMS ----- */
    tlReveal = gsap.timeline({
      paused: true,
      defaults: { ease: 'power3.out' },
      onStart: onRevealStart
    });

    tlReveal.to(world, {
      scale: act2Scale, y: act2Y,
      duration: 2.7, ease: 'power3.inOut'
    }, 0);
    tlReveal.to([kicker, buildingHud], {
      opacity: 0, y: -12, duration: 0.55, ease: 'power2.in'
    }, 0);
    tlReveal.to(floorEl, { opacity: 0.95, duration: 1.6, ease: 'power2.out' }, 0.2);
    tlReveal.to(campusBldgs, {
      scale: 1, duration: 1.2, ease: 'power3.out',
      stagger: { each: 0.05, from: 'random' }
    }, 0.4);
    tlReveal.to(ems, { scale: 1, y: 0, duration: 2.1, ease: 'power3.inOut' }, 0.3);

    tlReveal.addLabel('morph', 1.8);
    tlReveal.to(chB, { opacity: 0, y: -18, duration: 0.55, ease: 'power2.in' }, 'morph');
    tlReveal.to(chC, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 'morph+=0.05');

    tlReveal.addLabel('cems', 2.5);
    tlReveal.to(ems, { filter: emsGlow, duration: 1.0, ease: 'power2.out' }, 'cems');
    tlReveal.to(sub, { opacity: 1, y: 0, duration: 0.9 }, 'cems+=0.1');
    tlReveal.to(stats, { opacity: 1, y: 0, duration: 0.9 }, 'cems+=0.3');
    tlReveal.to(campusBldgs, {
      '--edge': EDGE_LIT, duration: 1.0, ease: 'power2.out',
      stagger: { each: 0.04, from: 'random' }
    }, 'cems');
    tlReveal.to(netCoreEl, { opacity: 1, scale: 1, duration: 1.0, ease: 'power2.out' }, 'cems');
    if (netLines.length) {
      tlReveal.to(netLines, {
        opacity: 1, duration: 0.8, ease: 'power2.out',
        stagger: { each: 0.03, from: 'random' }
      }, 'cems+=0.15');
    }
    /* 캠퍼스 창문이 하나둘 점등 — 도시가 살아난다 */
    if (campusLights.length) {
      tlReveal.to(campusLights, {
        opacity: 1, duration: 0.5, ease: 'power1.out',
        stagger: { each: 0.013, from: 'random' }
      }, 'cems+=0.2');
    }
    tlReveal.to(allBldgs, {
      '--glow': 0.32, duration: 0.5, ease: 'sine.out',
      yoyo: true, repeat: 1,
      stagger: { each: 0.04, from: 'random' }
    }, 'cems+=0.15');
    tlReveal.call(startCoreRings, null, 'cems+=0.4');
    tlReveal.call(startCampusAmbient, null, 'cems+=1.4');
  }

  /* ============================================================
     앰비언트 모션
     ============================================================ */
  function startAmbient() {
    stopHeroBlink();
    if (heroBldg) {
      heroBlink = gsap.to(heroBldg, {
        '--glow': 0.22, duration: 1.0, ease: 'sine.inOut',
        repeat: -1, yoyo: true
      });
    }
    /* 에너지 펄스 — 바닥에서 옥상으로 */
    var pulse = heroBldg && heroBldg._pulse;
    if (pulse) {
      if (heroPulseTw) heroPulseTw.kill();
      heroPulseTw = gsap.to(pulse, {
        keyframes: {
          y: [0, -(HERO_H * 1.05)],
          opacity: [0, 0.85, 0.85, 0]
        },
        duration: 2.8, ease: 'none', repeat: -1, repeatDelay: 0.7
      });
    }
    /* 창문 깜빡임 — 일부만 */
    var wins = (heroBldg && heroBldg._windows) || [];
    if (wins.length) {
      var pick = shuffle(wins.slice()).slice(0, Math.min(4, wins.length));
      if (winFlickerTw) winFlickerTw.kill();
      winFlickerTw = gsap.to(pick, {
        opacity: 0.16, duration: 1.4, ease: 'sine.inOut',
        repeat: -1, yoyo: true,
        stagger: { each: 0.5, from: 'random' }
      });
    }
  }

  function startCampusAmbient() {
    if (shimmer) shimmer.kill();
    if (campusBldgs.length) {
      shimmer = gsap.to(campusBldgs, {
        '--edge': 0.48, duration: 2.0, ease: 'sine.inOut',
        repeat: -1, yoyo: true,
        stagger: { each: 0.16, from: 'random' }
      });
    }
    /* 네트워크 빛 점이 캠퍼스 → 코어로 흐른다 */
    if (netDots.length) {
      if (netFlowTw) netFlowTw.kill();
      gsap.set(netDots, { left: '100%', opacity: 0 });
      netFlowTw = gsap.to(netDots, {
        keyframes: { left: ['100%', '0%'], opacity: [0, 1, 1, 0] },
        duration: 1.9, ease: 'none', repeat: -1,
        stagger: { each: 0.14, from: 'random' }
      });
    }
  }

  /* C-EMS 코어에서 펄스 링이 캠퍼스로 퍼진다 */
  function startCoreRings() {
    for (var k = 0; k < coreRingTws.length; k++) coreRingTws[k].kill();
    coreRingTws = [];
    for (var i = 0; i < coreRings.length; i++) {
      gsap.set(coreRings[i], { scale: 0.12, opacity: 0 });
      coreRingTws.push(gsap.to(coreRings[i], {
        keyframes: { scale: [0.12, 1.7], opacity: [0, 0.42, 0] },
        duration: 4.8, ease: 'sine.out', repeat: -1, delay: i * 1.6
      }));
    }
  }

  function stopHeroBlink() {
    if (heroBlink) { heroBlink.kill(); heroBlink = null; }
    if (heroBldg) gsap.set(heroBldg, { '--glow': 0 });
  }

  function onRevealStart() {
    stopHeroBlink();
    if (winFlickerTw) { winFlickerTw.kill(); winFlickerTw = null; }
  }

  function killAmbient() {
    stopHeroBlink();
    if (heroPulseTw) { heroPulseTw.kill(); heroPulseTw = null; }
    if (winFlickerTw) { winFlickerTw.kill(); winFlickerTw = null; }
    if (shimmer) { shimmer.kill(); shimmer = null; }
    if (netFlowTw) { netFlowTw.kill(); netFlowTw = null; }
    for (var i = 0; i < coreRingTws.length; i++) coreRingTws[i].kill();
    coreRingTws = [];
  }

  /* ============================================================
     재생 제어
     ============================================================ */
  function play() {
    if (!tlIntro || played) return;
    played = true;
    revealed = false;
    tlIntro.play(0);
  }

  function advance() {
    if (!played || revealed) return false;
    revealed = true;
    if (tlIntro.progress() < 1) {
      tlIntro.progress(1);
      startAmbient();
    }
    tlReveal.play(0);
    return true;
  }

  function observe() {
    var el = document.getElementById('slide-4');
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
