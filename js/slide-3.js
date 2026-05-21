/* ============================================================
   slide-3.js — 슬라이드 3 (자산과 에너지의 비교 · 가계부 한 줄)
   발표자가 스페이스바(또는 →·PageDown)로 3단계를 넘긴다:
   1) 이번 달 지출 300만원
   2) 5월 20일 | 청송 리조트 | 2만원        (자산 — 언제·어디서·얼마나)
   3) 5월 20일 17:10 | 중앙도서관 | 시간당 184kWh   (에너지)
   3단계 전환은 슬롯머신 릴 — 세 칸이 값을 돌리다 앞 칸부터 하나씩 멈춘다.
   전역 객체 AiceSlide3 { init, replay, advance } 노출
   ============================================================ */
window.AiceSlide3 = (function () {
  'use strict';

  /* ----- 콘텐츠 (편집 가능) ----- */
  var ASSET  = { when: '5월 20일',       where: '청송 리조트', howmuch: '2만원' };
  var ENERGY = { when: '5월 20일 17:10', where: '중앙도서관',  howmuch: '시간당 184kWh' };

  /* 슬롯이 돌 때 스쳐가는 후보값 (편집 가능) */
  var DECOYS = {
    when: ['5월 19일 22:40', '5월 20일 06:30', '5월 20일 09:15', '5월 20일 13:05',
           '5월 21일 08:50', '5월 18일 18:20', '5월 20일 11:40', '5월 22일 15:25',
           '5월 20일 20:10', '5월 17일 07:35', '5월 20일 14:55', '5월 23일 10:05'],
    where: ['공학1관', '학생회관', '자연과학관', '종합운동장', '제2도서관', '예술대학',
            '기숙사 A동', '대학본부', '정보전산원', '생명공학관', '법학전문대학원', '경상대학'],
    howmuch: ['시간당 92kWh', '시간당 230kWh', '시간당 51kWh', '시간당 147kWh',
              '시간당 308kWh', '시간당 76kWh', '시간당 199kWh', '시간당 124kWh',
              '시간당 265kWh', '시간당 43kWh', '시간당 171kWh', '시간당 218kWh']
  };
  /* 칸별 후보 개수 — 뒤 칸일수록 더 많이(=더 여러 바퀴) 돌고 늦게 멈춘다 */
  var DECOY_N = [11, 15, 19];

  var WORD_OFF  = 'drop-shadow(0 0 0px rgba(255,255,255,0))';
  var WORD_GLOW = 'drop-shadow(0 0 16px rgba(255,255,255,0.45))';

  var tlIntro, tlExpand, tlEnergy;
  var played = false;
  var stage = 1;            // 현재 단계 1·2·3
  var reels = [];           // 칸별 .reel 요소
  var reelN = [];           // 칸별 항목 수

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ----- 배경 파티클 (슬라이드 1~2 톤 재사용) ----- */
  function makeParticles() {
    var pc = document.getElementById('s3-particles');
    if (!pc || pc.childElementCount) return;
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

  /* ----- 슬롯 릴 생성 — [자산값 · 후보들… · 에너지값] ----- */
  function buildOneReel(valEl, assetTxt, pool, energyTxt, decoyCount) {
    valEl.innerHTML = '';
    var reel = document.createElement('span');
    reel.className = 'reel';
    var items = [assetTxt];
    var d = shuffle(pool);
    for (var i = 0; i < decoyCount; i++) items.push(d[i % d.length]);
    items.push(energyTxt);
    for (var k = 0; k < items.length; k++) {
      var it = document.createElement('span');
      it.className = 'reel-item';
      it.textContent = items[k];
      reel.appendChild(it);
    }
    valEl.appendChild(reel);
    gsap.set(reel, { yPercent: 0, filter: 'blur(0px)' });
    return reel;
  }
  function buildReels() {
    reels = []; reelN = [];
    var defs = [
      ['s3-v-when',    ASSET.when,    DECOYS.when,    ENERGY.when],
      ['s3-v-where',   ASSET.where,   DECOYS.where,   ENERGY.where],
      ['s3-v-howmuch', ASSET.howmuch, DECOYS.howmuch, ENERGY.howmuch]
    ];
    for (var i = 0; i < 3; i++) {
      var el = document.getElementById(defs[i][0]);
      if (!el) continue;
      reels[i] = buildOneReel(el, defs[i][1], defs[i][2], defs[i][3], DECOY_N[i]);
      reelN[i] = DECOY_N[i] + 2;
    }
  }

  /* ----- 슬롯 스핀 — 등속 회전 후 마지막 몇 칸에서 감속해 착지 ----- */
  function slotSpin(reel, N, dur) {
    var sub = gsap.timeline();
    var endY = -((N - 1) / N) * 100;
    var midY = endY * 0.8;
    /* 1막: 빠른 등속 회전 */
    sub.fromTo(reel, { yPercent: 0 }, { yPercent: midY, duration: dur * 0.5, ease: 'none' }, 0);
    /* 2막: 마지막 몇 칸을 감속하며 착지(튕김 없음) */
    sub.to(reel, { yPercent: endY, duration: dur * 0.5, ease: 'power3.out' }, dur * 0.5);
    /* 모션 블러 — 도는 동안 흐릿, 멈출 땐 선명 */
    sub.fromTo(reel, { filter: 'blur(0px)' }, { filter: 'blur(2px)', duration: dur * 0.22, ease: 'power1.out' }, 0);
    sub.to(reel, { filter: 'blur(0px)', duration: dur * 0.42, ease: 'power2.out' }, dur * 0.58);
    return sub;
  }

  /* ----- 가계부 태그 텍스트 플립 ----- */
  function flipText(el, html) {
    var sub = gsap.timeline();
    sub.to(el, { yPercent: -45, opacity: 0, duration: 0.26, ease: 'power2.in' })
       .add(function () { el.innerHTML = html; })
       .fromTo(el, { yPercent: 45, opacity: 0 },
                   { yPercent: 0, opacity: 1, duration: 0.44, ease: 'power3.out',
                     immediateRender: false });
    return sub;
  }

  /* ----- 단계 표시 (누적 채움) ----- */
  function setStep(n) {
    var dots = document.querySelectorAll('#slide-3 .step-dot');
    for (var i = 0; i < dots.length; i++) {
      if (i < n) dots[i].classList.add('on');
      else dots[i].classList.remove('on');
    }
  }

  /* ----- 타임라인 3개 (인트로 · 확장 · 에너지) ----- */
  function build() {
    var s = document.getElementById('slide-3');
    if (!s) return;

    var eyebrow   = document.getElementById('s3-eyebrow');
    var tag       = document.getElementById('s3-tag');
    var lump      = document.getElementById('s3-lump');
    var lumpLabel = s.querySelector('.lump-label');
    var lumpAmt   = s.querySelector('.lump-amt');
    var fields    = [ document.getElementById('s3-field-0'),
                      document.getElementById('s3-field-1'),
                      document.getElementById('s3-field-2') ];
    var div0      = document.getElementById('s3-div-0');
    var div1      = document.getElementById('s3-div-1');
    var labels    = s.querySelectorAll('.field-label');
    var vals      = s.querySelectorAll('.field-val');
    var rule      = document.getElementById('s3-rule');
    var steps     = document.getElementById('s3-steps');
    if (!lump || !fields[0] || labels.length !== 3) return;

    if (tlIntro)  tlIntro.kill();
    if (tlExpand) tlExpand.kill();
    if (tlEnergy) tlEnergy.kill();

    /* 슬롯 릴 생성 + 가계부 태그 원복 */
    buildReels();
    tag.innerHTML = '가계부';
    gsap.set(tag, { yPercent: 0 });

    /* 기준 상태 */
    gsap.set(lump, { opacity: 1, y: 0, scale: 1 });
    gsap.set(rule, { scaleX: 0 });
    gsap.set(fields, { scale: 1 });
    gsap.set(labels, { filter: WORD_OFF, scale: 1 });
    setStep(0);

    /* ── 인트로 (Stage 1 — 압도하는 한 줄) ── */
    tlIntro = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    tlIntro.fromTo(eyebrow,   { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7 }, 0);
    tlIntro.fromTo(tag,       { opacity: 0, y: 8 },  { opacity: 1, y: 0, duration: 0.5 }, 0.35);
    tlIntro.to(rule, { scaleX: 1, duration: 0.75, ease: 'power2.out' }, 0.4);
    tlIntro.fromTo(lumpLabel, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, 0.62);
    tlIntro.fromTo(lumpAmt,   { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.85, ease: 'expo.out' }, 0.72);
    tlIntro.fromTo(steps,     { opacity: 0 },        { opacity: 1, duration: 0.4 }, 0.95);

    /* ── 확장 (Stage 1 → 2 — 한 줄이 세 칸으로 펼쳐진다) ── */
    tlExpand = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    tlExpand.to(lump, { opacity: 0, y: -26, scale: 0.93, duration: 0.46, ease: 'power2.in' }, 0);
    tlExpand.fromTo(fields[0], { x: 120 }, { x: 0, duration: 0.72, ease: 'expo.out' }, 0.28);
    tlExpand.fromTo(fields[2], { x: -120 }, { x: 0, duration: 0.72, ease: 'expo.out' }, 0.28);
    tlExpand.fromTo([div0, div1], { opacity: 0, scaleY: 0 },
                    { opacity: 1, scaleY: 1, duration: 0.5, stagger: 0.07 }, 0.42);
    tlExpand.fromTo(vals, { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.08 }, 0.5);
    tlExpand.fromTo(labels, { opacity: 0, y: -14 },
                    { opacity: 1, y: 0, duration: 0.55, stagger: 0.1 }, 0.56);
    tlExpand.to(labels, { filter: WORD_GLOW, duration: 0.5, stagger: 0.1 }, 0.74);

    /* ── 에너지 전환 (Stage 2 → 3 — 슬롯이 앞 칸부터 하나씩 멈춘다) ── */
    tlEnergy = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    tlEnergy.add(flipText(tag, '에너지 가계부'), 0);
    var starts = [0, 0.12, 0.24];
    var durs   = [1.2, 1.75, 2.4];
    for (var i = 0; i < 3; i++) {
      if (!reels[i]) continue;
      tlEnergy.add(slotSpin(reels[i], reelN[i], durs[i]), starts[i]);
      var stop = starts[i] + durs[i];
      /* 착지 — 헤더·칸이 짧게 '딸깍' */
      tlEnergy.to(labels[i], { scale: 1.12, duration: 0.16, yoyo: true, repeat: 1,
                               ease: 'power2.inOut' }, stop - 0.04);
      tlEnergy.to(fields[i], { scale: 1.04, duration: 0.14, yoyo: true, repeat: 1,
                               ease: 'power2.inOut' }, stop - 0.04);
    }
  }

  /* ----- 슬라이드 진입 시 1단계 자동 재생 ----- */
  function play() {
    if (played) return;
    played = true;
    stage = 1;
    setStep(1);
    tlIntro.play(0);
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

  /* ----- 발표자 단계 진행 (스페이스바) -----
     반환 true = 내부 단계 소비(덱 멈춤) · false = 더 없음(덱이 다음 슬라이드로) */
  function advance() {
    if (!played) { play(); return true; }
    if (stage === 1) {
      if (tlIntro && tlIntro.progress() < 1) tlIntro.progress(1);
      stage = 2; setStep(2); tlExpand.play(0);
      return true;
    }
    if (stage === 2) {
      if (tlExpand && tlExpand.progress() < 1) tlExpand.progress(1);
      stage = 3; setStep(3); tlEnergy.play(0);
      return true;
    }
    if (tlEnergy && tlEnergy.progress() < 1) tlEnergy.progress(1);   // 스핀 중이면 끝까지
    return false;   // 3단계까지 끝 → 다음 슬라이드
  }

  /* ----- 공개 API ----- */
  function setup() {
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
    stage = 1;
    build();
    play();
  }

  return { init: init, replay: replay, advance: advance };
})();
