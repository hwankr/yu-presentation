/* ============================================================
   slide-1.js — 슬라이드 1 (인트로) 애니메이션
   전역 객체 AiceSlide1 { init, replay } 노출
   ============================================================ */
window.AiceSlide1 = (function () {
  'use strict';

  var tl;   // 인트로 타임라인

  /* ----- 배경 파티클 ----- */
  function makeParticles() {
    var pc = document.getElementById('s1-particles');
    if (!pc) return;
    for (var i = 0; i < 14; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top  = Math.random() * 100 + '%';
      pc.appendChild(p);
      gsap.set(p, { opacity: 0.06 + Math.random() * 0.18 });
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

  /* ----- 인트로 타임라인 ----- */
  function build() {
    var letterA = document.getElementById('letterA');
    var letterI = document.getElementById('letterI');
    var letterC = document.getElementById('letterC');
    var letterE = document.getElementById('letterE');
    var slot    = document.querySelector('#slide-1 .slot');
    if (!letterA || !letterI || !letterC || !letterE || !slot) return;

    if (tl) tl.kill();

    gsap.set('#slide-1 .stage, #slide-1 .label, #slide-1 .tagline, #slide-1 .letter, #slide-1 .ink, #slide-1 .member',
             { clearProps: 'all' });
    gsap.set(slot, { width: 0 });
    gsap.set('#slide-1 .stage', { opacity: 0 });
    gsap.set(letterI, { opacity: 0, y: -82, xPercent: -50 });
    gsap.set('#slide-1 .ai .ink', { color: 'rgba(244,244,242,0)' });   // A·i 는 빈 윤곽선으로 시작

    var iW = letterI.getBoundingClientRect().width;   // "i" 너비 = 벌어질 간격

    tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl
      .to('#slide-1 .stage', { opacity: 1, duration: 0.5 })
      // 1) "Ace" 가 윤곽선으로 스르륵 떠오름
      .from([letterA, letterC, letterE],
            { y: 40, opacity: 0, duration: 1.0, stagger: 0.16, ease: 'expo.out' }, 0.1)
      // 2) 짧은 호흡
      .to({}, { duration: 0.2 })
      // 3) A와 c 사이가 벌어짐
      .addLabel('spread')
      .to(slot, { width: iW, duration: 0.62, ease: 'power3.inOut' }, 'spread')
      // 4) "i" 가 곧바로 미끄러져 들어옴
      .to(letterI, { opacity: 1, y: 0, duration: 0.72, ease: 'expo.out' }, 'spread+=0.08')
      // 5) 클라이맥스 — A·i 가 안에서부터 채워짐
      .addLabel('lit', '-=0.1')
      .to('#slide-1 .ai .ink',
          { color: 'rgba(244,244,242,1)', duration: 0.85, stagger: 0.16, ease: 'power2.out' }, 'lit')
      .to([letterA, letterI],
          { filter: 'drop-shadow(0 0 26px rgba(255,255,255,0.42))', duration: 0.9 }, 'lit+=0.15')
      .to([letterA, letterI],
          { scale: 1.045, duration: 0.6, ease: 'power2.out', transformOrigin: '50% 100%' }, 'lit+=0.15')
      .to([letterA, letterI],
          { scale: 1, duration: 1.25, ease: 'power2.inOut' }, 'lit+=0.7')
      // 6) 라벨 · 태그라인 · 팀원 순차 공개
      .from('#slide-1 .label',   { y: -16, opacity: 0, duration: 0.9 }, 'lit+=0.35')
      .from('#slide-1 .tagline', { y:  16, opacity: 0, duration: 1.0 }, '<0.12')
      .from('#slide-1 .member',  { y:  22, opacity: 0, duration: 0.85, stagger: 0.1 }, '<0.28');

    return tl;
  }

  /* ----- 공개 API ----- */
  function init() {
    makeParticles();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(build);
    } else {
      build();
    }
  }
  function replay() { if (tl) tl.restart(); }

  return { init: init, replay: replay };
})();
