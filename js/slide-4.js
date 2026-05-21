/* ============================================================
   slide-4.js — 슬라이드 4 (예측 엔진 · 머신러닝 작동 원리)
   가로 3단 수렴 파이프라인이 자동 재생된다.
   입력 변수가 점등 → 빛 점이 연결선을 타고 모델로 흐르며 각 입력에
   가중치가 적용됨 → 예측 모델의 가중치 행렬이 churn 끝에 한 칸씩
   lock-in 되며 학습 100% 완성 → 그 순간 예측 전력 사용량이
   카운트업으로 차오른다. 끝까지 남는 키워드는 "예측".
   전역 객체 AiceSlide4 { init, replay } 노출
   ============================================================ */
window.AiceSlide4 = (function () {
  'use strict';

  /* ----- 타임라인 비트 (초) ----- */
  var CONV        = 2.6;     // 수렴 시작 — 입력 → 모델
  var CHURN_START = 3.2;     // 가중치 행렬 churn 시작
  var LOCK_START  = 4.3;     // 가중치 lock-in 스윕 시작
  var LOCK_GAP    = 0.058;   // 셀별 lock 간격
  var LOCK_DUR    = 1.46;    // 학습 진행 막대가 차는 시간
  var COUNT       = 6.0;     // 예측 사용량 카운트업
  var KICK        = 8.0;     // 마무리 킥커

  var COMPLETE    = LOCK_START + LOCK_DUR;          // 모델 완성 시점
  var CHURN_DUR   = COMPLETE - CHURN_START + 0.15;  // churn 지속

  var CHIP_GLOW = 'drop-shadow(0 0 7px rgba(255,255,255,0.22))';
  var CHIP_OFF  = 'drop-shadow(0 0 0px rgba(255,255,255,0))';

  /* 입력 변수별 적용 가중치 (편집 가능 — 칩 DOM 순서와 일치) */
  var INPUT_WEIGHTS = [0.86, 0.43, 0.71,          // 기온·습도·일사량
                       0.78, 0.92, 0.59, 0.89];   // 건물용도·시험기간·축제·과거전력패턴

  var MATRIX_N = 24;         // 가중치 행렬 셀 수 (6×4)
  var OUT_TARGET = 142.8;    // 예측 전력 사용량 kW (편집 가능)

  var tl;
  var played = false;
  var inputWires = [];       // [{path, dot, sx, sy, ex, ey, len}]
  var outputWire = null;
  var matrixCells = [];      // [{el, val, locked}]
  var churnCount = 0;
  var ambient = [];

  /* ============================================================
     배경 입자
     ============================================================ */
  function makeParticles() {
    var pc = document.getElementById('s4-particles');
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

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* 가중치 표기 — 부호 + 소수 2자리 (앞 0 생략): "+.62" / "-.41" */
  function fmtW(v) {
    var s = v < 0 ? '-' : '+';
    return s + Math.abs(v).toFixed(2).slice(1);
  }
  function randW() { return fmtW(Math.random() * 1.8 - 0.9); }

  /* ============================================================
     예측 모델 — 가중치 행렬 셀
     ============================================================ */
  function buildMatrix() {
    var mx = document.getElementById('s4-matrix');
    if (!mx) return;
    mx.innerHTML = '';
    matrixCells = [];
    for (var i = 0; i < MATRIX_N; i++) {
      var c = document.createElement('span');
      c.className = 'wcell';
      mx.appendChild(c);
      matrixCells.push({ el: c, val: randW(), locked: false });
    }
  }

  /* ============================================================
     연결선 — 가중치·모델·출력의 화면 좌표로 직선 path 생성
     ============================================================ */
  function buildWires() {
    var pipe   = document.getElementById('s4-pipeline');
    var svg    = document.getElementById('s4-wires');
    var model  = document.getElementById('s4-model');
    var rdout  = document.getElementById('s4-readout');
    var inputs = document.querySelector('#slide-4 .inputs');
    if (!pipe || !svg || !model || !rdout || !inputs) return;

    var wts = document.querySelectorAll('#slide-4 .wt');
    var pr = pipe.getBoundingClientRect();
    if (pr.width < 10) return;

    svg.innerHTML = '';
    svg.setAttribute('viewBox', '0 0 ' + pr.width + ' ' + pr.height);
    inputWires = [];
    outputWire = null;

    var mr = model.getBoundingClientRect();
    var mCy = mr.top - pr.top + mr.height / 2;

    /* 입력 가중치 → 모델 왼쪽 수렴점. 선은 입력 그룹 박스의 오른쪽 모서리에서 출발한다. */
    var inX = inputs.getBoundingClientRect().right - pr.left;
    var ex = mr.left - pr.left + 4, ey = mCy;
    var i, paths = [], dots = [];
    for (i = 0; i < wts.length; i++) {
      var w = wts[i].getBoundingClientRect();
      var sx = inX;
      var sy = w.top - pr.top + w.height / 2;
      var wire = makeWire(sx, sy, ex, ey);
      paths.push(wire.path); dots.push(wire.dot);
      inputWires.push(wire);
    }

    /* 모델 오른쪽 → 예측 사용량 readout */
    var rr = rdout.getBoundingClientRect();
    var ox = rr.left - pr.left;
    var oy = rr.top - pr.top + rr.height / 2;
    outputWire = makeWire(mr.right - pr.left - 4, mCy, ox, oy);

    for (i = 0; i < paths.length; i++) svg.appendChild(paths[i]);
    svg.appendChild(outputWire.path);
    for (i = 0; i < dots.length; i++) svg.appendChild(dots[i]);
    svg.appendChild(outputWire.dot);
  }

  function makeWire(sx, sy, ex, ey) {
    var path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('class', 'wire');
    path.setAttribute('d', 'M' + sx.toFixed(1) + ',' + sy.toFixed(1) +
                            ' L' + ex.toFixed(1) + ',' + ey.toFixed(1));
    var dot = document.createElementNS(SVGNS, 'circle');
    dot.setAttribute('class', 'wiredot');
    dot.setAttribute('r', '3.2');
    dot.setAttribute('cx', sx.toFixed(1));
    dot.setAttribute('cy', sy.toFixed(1));
    return {
      path: path, dot: dot,
      sx: sx, sy: sy, ex: ex, ey: ey,
      len: Math.sqrt((ex - sx) * (ex - sx) + (ey - sy) * (ey - sy))
    };
  }

  /* ============================================================
     예측 곡선 — 적정 범위 밴드 + 예측 라인
     ============================================================ */
  function buildForecast() {
    /* 하루 전력 예측값 0..1 (편집 가능) */
    var m = [0.30, 0.27, 0.26, 0.30, 0.40, 0.54, 0.66, 0.74,
             0.80, 0.82, 0.78, 0.70, 0.66, 0.69, 0.64, 0.60];
    var margin = 0.15;
    var W = 260, H = 80, pad = 10;
    var iw = W - pad * 2, ih = H - pad * 2, n = m.length;

    function X(i) { return pad + (i / (n - 1)) * iw; }
    function Y(v) { return pad + (1 - Math.max(0, Math.min(1, v))) * ih; }

    var line = 'M' + X(0).toFixed(1) + ',' + Y(m[0]).toFixed(1);
    var up = 'M' + X(0).toFixed(1) + ',' + Y(m[0] + margin).toFixed(1);
    var i;
    for (i = 1; i < n; i++) {
      line += ' L' + X(i).toFixed(1) + ',' + Y(m[i]).toFixed(1);
      up   += ' L' + X(i).toFixed(1) + ',' + Y(m[i] + margin).toFixed(1);
    }
    var band = up;
    for (i = n - 1; i >= 0; i--) {
      band += ' L' + X(i).toFixed(1) + ',' + Y(m[i] - margin).toFixed(1);
    }
    band += ' Z';
    return { line: line, band: band, end: [X(n - 1), Y(m[n - 1])] };
  }

  /* ============================================================
     타임라인
     ============================================================ */
  function build() {
    var eyebrow  = document.getElementById('s4-eyebrow');
    var spot     = document.querySelector('#slide-4 .bg-spot');
    var model    = document.getElementById('s4-model');
    var matrix   = document.getElementById('s4-matrix');
    var progFill = document.getElementById('s4-prog-fill');
    var progNum  = document.getElementById('s4-prog-num');
    var weatherBox = document.getElementById('s4-weather');
    var campusBox  = document.getElementById('s4-campus');
    var wChips   = document.querySelectorAll('#s4-weather .chip');
    var cChips   = document.querySelectorAll('#s4-campus .chip');
    var allChips = document.querySelectorAll('#slide-4 .chip');
    var wtEls    = document.querySelectorAll('#slide-4 .wt');
    var outLabel = document.querySelector('#slide-4 .out-label');
    var readout  = document.getElementById('s4-readout');
    var outNum   = document.getElementById('s4-out-num');
    var outCap   = document.querySelector('#slide-4 .out-cap');
    var fcBand   = document.querySelector('#slide-4 .fc-band');
    var fcLine   = document.querySelector('#slide-4 .fc-line');
    var fcDot    = document.querySelector('#slide-4 .fc-dot');
    var kicker   = document.getElementById('s4-kicker');
    var kw       = document.querySelector('#slide-4 .kicker .kw');
    if (!model || !matrix || !inputWires.length || !outputWire) return;

    if (tl) tl.kill();
    killAmbient();
    churnCount = 0;

    /* 예측 곡선 path 주입 + 길이 측정 */
    var fc = buildForecast();
    fcBand.setAttribute('d', fc.band);
    fcLine.setAttribute('d', fc.line);
    fcDot.setAttribute('cx', fc.end[0].toFixed(1));
    fcDot.setAttribute('cy', fc.end[1].toFixed(1));
    var flen = fcLine.getTotalLength ? fcLine.getTotalLength() : 320;

    /* 행렬 셀 초기화 — 빈 칸·잠금 해제 */
    var i, cellEls = [];
    for (i = 0; i < matrixCells.length; i++) {
      matrixCells[i].locked = false;
      matrixCells[i].el.textContent = '';
      matrixCells[i].el.classList.remove('locked');
      cellEls.push(matrixCells[i].el);
    }

    var inPaths = [];
    for (i = 0; i < inputWires.length; i++) inPaths.push(inputWires[i].path);

    /* ----- 초기 상태 ----- */
    gsap.set(spot, { opacity: 0.55 });
    gsap.set(eyebrow, { opacity: 0, y: -8 });
    gsap.set([weatherBox, campusBox], { opacity: 0, y: 10 });
    gsap.set(allChips, { opacity: 0, scale: 0.9, filter: CHIP_OFF });
    gsap.set(wtEls, { opacity: 0, x: -6 });
    gsap.set(model, { opacity: 0, '--mglow': 0, borderColor: 'rgba(244,244,242,0.16)' });
    gsap.set(matrix, { opacity: 0 });
    gsap.set(progFill, { scaleX: 0 });
    gsap.set(progNum, { color: 'rgba(244,244,242,0.55)' });

    for (i = 0; i < inputWires.length; i++) {
      var w = inputWires[i];
      gsap.set(w.path, { strokeDasharray: w.len, strokeDashoffset: w.len });
      gsap.set(w.dot, { opacity: 0, attr: { cx: w.sx, cy: w.sy } });
    }
    gsap.set(outputWire.path, {
      strokeDasharray: outputWire.len, strokeDashoffset: outputWire.len
    });
    gsap.set(outputWire.dot, { opacity: 0, attr: { cx: outputWire.sx, cy: outputWire.sy } });

    gsap.set(outLabel, { opacity: 0, y: 6 });
    gsap.set(readout, { opacity: 0 });
    outNum.textContent = '0.0';
    gsap.set(outCap, { opacity: 0 });
    gsap.set(fcBand, { opacity: 0 });
    gsap.set(fcLine, { strokeDasharray: flen, strokeDashoffset: flen });
    gsap.set(fcDot, { opacity: 0, scale: 0, transformOrigin: '50% 50%' });
    gsap.set(kicker, { opacity: 0, y: 10 });
    gsap.set(kw, { filter: CHIP_OFF });

    /* ----- 타임라인 ----- */
    tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });

    /* 1) eyebrow */
    tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.7 }, 0);

    /* 모델 패널 프레임 등장 (빈 모델이 먼저 떠오른다) */
    tl.to(model, { opacity: 1, duration: 0.85, ease: 'power2.out' }, 0.5);

    /* 2) 기상 데이터 — 그룹 박스가 먼저 떠오르고 → 칩이 점등 */
    tl.to(weatherBox, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.55);
    tl.to(wChips, {
      opacity: 1, scale: 1, filter: CHIP_GLOW,
      duration: 0.5, ease: 'power2.out', stagger: 0.1
    }, 0.8);

    /* 3) 캠퍼스 특성 데이터 — 그룹 박스 → 칩 점등 */
    tl.to(campusBox, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 1.3);
    tl.to(cChips, {
      opacity: 1, scale: 1, filter: CHIP_GLOW,
      duration: 0.5, ease: 'power2.out', stagger: 0.09
    }, 1.55);

    /* 4) 수렴 — 연결선 드로잉 + 빛 점이 모델로, 입력별 가중치 적용 */
    tl.to(inPaths, {
      strokeDashoffset: 0, duration: 0.62, ease: 'power2.out', stagger: 0.055
    }, CONV);
    for (i = 0; i < inputWires.length; i++) {
      var dotPos = CONV + 0.12 + i * 0.075;
      addWireDot(tl, inputWires[i], dotPos, 0.8, 'power1.in');
      addInputWeight(tl, wtEls[i], INPUT_WEIGHTS[i], dotPos + 0.74);
    }

    /* 5) 학습 — 가중치 행렬 churn → 한 칸씩 lock-in */
    tl.to(matrix, { opacity: 1, duration: 0.4 }, CHURN_START - 0.1);
    var churnProxy = { v: 0 };
    tl.to(churnProxy, {
      v: 1, duration: CHURN_DUR, ease: 'none', onUpdate: churnTick
    }, CHURN_START);
    for (i = 0; i < matrixCells.length; i++) {
      tl.call(lockAt(i), null, LOCK_START + i * LOCK_GAP);
    }
    /* 학습 진행 막대 0 → 100% */
    tl.to(progFill, { scaleX: 1, duration: LOCK_DUR, ease: 'none' }, LOCK_START);
    var progProxy = { v: 0 };
    tl.to(progProxy, {
      v: 100, duration: LOCK_DUR, ease: 'none',
      onUpdate: function () { progNum.textContent = Math.round(progProxy.v) + '%'; }
    }, LOCK_START);

    /* 6) 모델 완성 — 패널 글로우 + 진행 수치 점등 */
    tl.to(model, {
      '--mglow': 0.42, borderColor: 'rgba(244,244,242,0.42)',
      duration: 0.6, ease: 'power2.out'
    }, COMPLETE);
    tl.to(progNum, { color: '#ffffff', duration: 0.4 }, COMPLETE);
    tl.call(startAmbient, null, COMPLETE + 0.35);

    /* 7) 예측 출력 — 모델 완성에 따라 사용량이 카운트업 */
    tl.to(outputWire.path, {
      strokeDashoffset: 0, duration: 0.45, ease: 'power2.out'
    }, COMPLETE + 0.05);
    addWireDot(tl, outputWire, COMPLETE + 0.1, 0.5, 'power1.inOut');
    tl.to(outLabel, { opacity: 1, y: 0, duration: 0.55 }, COUNT - 0.35);
    tl.to(readout, { opacity: 1, duration: 0.4 }, COUNT - 0.1);
    addCount(tl, outNum, COUNT, OUT_TARGET, 1, 1.7);
    tl.to(fcBand, { opacity: 1, duration: 0.6 }, COUNT + 0.2);
    tl.to(fcLine, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.out' }, COUNT + 0.25);
    tl.to(fcDot, {
      opacity: 1, scale: 1, duration: 0.55, ease: 'power3.out'
    }, COUNT + 1.5);
    tl.to(outCap, { opacity: 1, duration: 0.55 }, COUNT + 1.4);

    /* 8) 마무리 킥커 — "예측" 솔리드 강조 */
    tl.to(kicker, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, KICK);
    tl.to(kw, {
      filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.42))',
      duration: 0.9, ease: 'power2.out'
    }, KICK + 0.15);

    return tl;
  }

  /* churn — 잠기지 않은 셀에 난수 가중치를 빠르게 흘린다 (3프레임마다) */
  function churnTick() {
    churnCount++;
    if (churnCount % 3 !== 0) return;
    for (var i = 0; i < matrixCells.length; i++) {
      if (!matrixCells[i].locked) matrixCells[i].el.textContent = randW();
    }
  }

  /* lock-in — 셀을 최종 가중치로 고정 */
  function lockAt(idx) {
    return function () {
      var c = matrixCells[idx];
      if (!c) return;
      c.locked = true;
      c.el.textContent = c.val;
      c.el.classList.add('locked');
    };
  }

  /* 빛 점 한 개의 이동을 타임라인에 추가 */
  function addWireDot(timeline, w, pos, dur, ease) {
    timeline.to(w.dot, { opacity: 1, duration: 0.16 }, pos);
    timeline.to(w.dot, {
      attr: { cx: w.ex, cy: w.ey }, duration: dur, ease: ease
    }, pos);
    timeline.to(w.dot, { opacity: 0, duration: 0.2 }, pos + dur * 0.86);
  }

  /* 입력 가중치 적용 — 빛 점이 닿을 때 칩 옆에 값이 뜬다 */
  function addInputWeight(timeline, el, value, pos) {
    timeline.call(function () {
      el.textContent = '×' + value.toFixed(2);
    }, null, pos);
    timeline.to(el, { opacity: 1, x: 0, duration: 0.42, ease: 'power3.out' }, pos);
  }

  /* 숫자 카운트업 */
  function addCount(timeline, el, pos, target, dec, dur) {
    var p = { v: 0 };
    el.textContent = (0).toFixed(dec);
    timeline.to(p, {
      v: target, duration: dur, ease: 'power2.out',
      onUpdate: function () {
        el.textContent = dec > 0
          ? p.v.toFixed(dec)
          : Math.round(p.v).toLocaleString('en-US');
      }
    }, pos);
  }

  /* ============================================================
     앰비언트 모션 — 모델 완성 후
     ============================================================ */
  function startAmbient() {
    killAmbient();
    var model = document.getElementById('s4-model');
    var fcDot = document.querySelector('#slide-4 .fc-dot');
    if (model) {
      ambient.push(gsap.to(model, {
        '--mglow': 0.22, duration: 2.0, ease: 'sine.inOut', yoyo: true, repeat: -1
      }));
    }
    if (fcDot) {
      ambient.push(gsap.to(fcDot, {
        opacity: 0.55, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1
      }));
    }
    /* 잠긴 행렬 셀 몇 개가 은은히 깜빡 — 모델이 살아 작동하는 느낌 */
    var lit = [];
    for (var i = 0; i < matrixCells.length; i++) lit.push(matrixCells[i].el);
    shuffle(lit);
    var pick = lit.slice(0, 5);
    if (pick.length) {
      ambient.push(gsap.to(pick, {
        opacity: 0.42, duration: 1.5, ease: 'sine.inOut',
        yoyo: true, repeat: -1,
        stagger: { each: 0.5, from: 'random' }
      }));
    }
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
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
    buildWires();   // 재생 직전 좌표 재계산 — 리사이즈에도 정확
    build();
    if (tl) tl.play(0);
  }

  /* 리사이즈 — 연결선은 화면 좌표 기반이라 재계산이 필요하다. */
  var resizeTimer = null;
  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!played) return;
      buildWires();
      build();
      if (tl) tl.progress(1);   // 이미 끝난 상태 → 새 좌표로 종료 프레임 재구성
    }, 180);
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

  /* ----- 공개 API ----- */
  function setup() {
    buildMatrix();
    buildWires();
    build();
    observe();
  }
  function init() {
    makeParticles();
    window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(setup);
    } else {
      setup();
    }
  }
  function replay() {
    played = false;
    killAmbient();
    buildMatrix();
    play();
  }

  return { init: init, replay: replay };
})();
