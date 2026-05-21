# AGENTS.md — Aice 해커톤 발표 웹

> AI 에이전트(Claude Code, Codex 등)와 협업자를 위한 프로젝트 지침서.
> **새 세션을 시작하면 이 파일과 `docs/` 폴더를 먼저 읽으세요.**

## 프로젝트 개요

**Aice** 팀의 해커톤 발표용 인터랙티브 웹사이트.
정적인 슬라이드 덱이 아니라, 애니메이션이 풍부한 커스텀 웹 경험. **슬라이드 단위**로 구성한다.

## 기술 스택 (확정 · 변경 금지)

- **순수 HTML + CSS + JavaScript.** 프레임워크 없음, 빌드 단계 없음.
- 애니메이션: **GSAP** (필요 시 ScrollTrigger). `vendor/` 에 로컬 보관 — 런타임에 CDN 의존 금지.
- 선택적 라이브러리(Three.js, tsParticles, Lenis 등)는 해당 슬라이드에 꼭 필요할 때만 추가하고 반드시 로컬에 보관.
- 스타일: 순수 CSS.

> **채택 이유:** React 등 프레임워크도 검토했으나, 발표장에서 빌드·서버 없이 확실히 동작하고
> 오프라인 안정성이 높은 순수 HTML을 선택했다. 이 결정은 번복하지 않는다.

## 절대 원칙

1. **`index.html` 더블클릭만으로 실행**되어야 한다. 서버 불필요.
2. **완전 오프라인 동작.** 발표장 와이파이를 신뢰하지 않는다. 모든 에셋(폰트·라이브러리·이미지)을 로컬 보관.
3. 우선순위: **화려한 애니메이션 + 발표 안정성의 균형.** 멋지되 절대 안 깨져야 한다.

## 디자인 언어 (슬라이드 1에서 확정 — 전 슬라이드 공통)

- **배경:** 검정 (`--bg #0a0a0b`). 은은한 스포트라이트 + 비네팅 + 옅은 입자.
- **색:** 모노톤. `--text #f4f4f2`, `--dim`(흐린 텍스트). 컬러 액센트 없음.
- **글씨체:** 워드마크·큰 타이틀은 **Fraunces**(세리프). 본문·UI·한글은 **Pretendard**.
- **모션:** 튕김 없이 "스르륵" 흐르는 부드러운 이징(`expo.out` / `power3`). 느긋하고 시네마틱하게.
- **강조:** 색이 아니라 **형태 대비**로 — 솔리드(채움) vs 윤곽선, 명암 대비 등.
- 새 슬라이드는 `css/base.css`의 전역 변수·폰트를 반드시 재사용해 톤을 통일한다.

### 하지 말 것 (사용자가 명시적으로 거부한 방향)

- ❌ 파란색 등 컬러 액센트 — "너무 푸른 느낌"
- ❌ 글자에 메탈릭/그라데이션 질감 — "촌스럽다"
- ❌ 통통 튀는 bounce·back 이징 — "스르륵" 부드러운 모션으로 교체됨

## 세션 재개 방법 (매 세션 시작 시 필독)

1. `docs/progress.md` — 현재 상태와 **다음 할 일**.
2. `docs/slides.md` — 슬라이드별 상세 명세 (콘텐츠·애니메이션의 단일 진실 소스).
3. `docs/overview.md` — 프로젝트 배경과 결정사항.

→ 작업을 마치면 **반드시 `docs/progress.md`를 갱신**해 다음 세션이 이어갈 수 있게 한다.

## 프로젝트 구조

```
/
├── AGENTS.md                      ← 이 파일
├── index.html                     ← 발표 웹 본체 (슬라이드 섹션 모음)
├── docs/                          ← 기획 · 명세 · 진행상황
│   ├── overview.md
│   ├── slides.md
│   └── progress.md
├── css/
│   ├── base.css                   ← 폰트·리셋·전역변수·덱 레이아웃(scroll-snap)
│   └── slide-1.css … slide-8.css  ← 슬라이드별 전용 스타일 (#slide-N 으로 스코프)
├── js/
│   ├── main.js                    ← 부트스트랩 (슬라이드 초기화·내비게이션)
│   └── slide-1.js … slide-8.js    ← 슬라이드별 애니메이션 (AiceSlideN)
├── vendor/
│   └── gsap.min.js                ← GSAP (로컬)
└── assets/
    └── fonts/
        ├── Fraunces.woff2         ← 워드마크 (variable)
        └── PretendardVariable.woff2  ← 본문·UI 한글+영문 (variable)
```

실행: `index.html` 더블클릭. 로컬 정적 서버로 보려면 `python -m http.server` (`.claude/launch.json`에 `aice` 설정 있음).

> `.superpowers/` 폴더는 브레인스토밍 시안 임시 파일 — **결과물 아님, 무시**한다.

## 슬라이드 추가 규칙

- `index.html` 에 `<section class="slide" id="slide-N">` 추가
- `css/slide-N.css` 작성 (셀렉터는 `#slide-N` 으로 스코프), `index.html` 에 link
- `js/slide-N.js` 작성 (`window.AiceSlideN = { init, ... }` 패턴), `index.html` 에 script
- `js/main.js` 에서 초기화 연결
- ES 모듈 금지 (`file://` CORS) — 클래식 `<script>` 만 사용

## 컨벤션

- 슬라이드 1개 = 섹션 1개. ID는 `slide-1`, `slide-2`, …
- 각 슬라이드는 독립적으로: 자체 HTML 섹션 / CSS / JS 초기화 함수.
- 애니메이션은 GSAP 타임라인으로 작성하고, 슬라이드 진입 시 트리거.
- 디자인·구성 결정은 먼저 `docs/`에 기록한 뒤 코드에 반영한다.
