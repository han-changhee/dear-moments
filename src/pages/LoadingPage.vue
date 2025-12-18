<!-- src/pages/LoadingPage.vue -->
<template>
  <section class="loading">
    <!-- 배경 장식 -->
    <div class="glow glow-1" aria-hidden="true"></div>
    <div class="glow glow-2" aria-hidden="true"></div>
    <div class="grain" aria-hidden="true"></div>

    <!-- 컨텐츠 -->
    <div class="card">
      <!-- 하트 링 -->
      <div class="ring" aria-hidden="true">
        <svg viewBox="0 0 120 120" class="ring-svg">
          <!-- 은은한 링 -->
          <circle cx="60" cy="60" r="42" class="ring-base"/>
          <!-- 하트 아이콘 -->
          <path class="heart"
                d="M60 84c-1.1 0-2.2-.38-3.1-1.12C46.5 74.4 39.2 68.27 34.7 62.6c-3.64-4.57-5.6-9.24-5.6-14.02 0-7.1 5.25-12.58 11.9-12.58 3.9 0 7.4 1.86 9.98 5.23l.98 1.26.98-1.26c2.58-3.37 6.08-5.23 9.98-5.23 6.66 0 11.9 5.48 11.9 12.58 0 4.78-1.96 9.45-5.6 14.02-4.5 5.67-11.84 11.8-22.2 20.28-.9.74-2 .12-2.9-.44Z"/>
        </svg>
      </div>

      <!-- 텍스트 -->
      <h1 class="title">Wait..</h1>
      <p class="subtitle">
        소중한 순간을 불러오는 중...<br> 大切な瞬間を読み込んでいます...<span class="dots" aria-hidden="true">
          <i></i><i></i><i></i>
        </span>
      </p>

      <!-- 프로그레스 -->
      <div class="progress" role="progressbar" aria-label="로딩 중" aria-valuemin="0" aria-valuemax="100" aria-valuenow="80">
        <div class="bar"></div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  // 2초 대기 후 main으로 이동 (progress 애니메이션과 타이밍 맞춤)
  setTimeout(() => {
    router.replace('/main')
  }, 2000)
})
</script>

<style scoped>
:root{
  --bg1: #f6f1ff;   /* 라일락 톤 */
  --bg2: #fff7fb;   /* 로지 핑크 톤 */
  --accent: #ff8aa3;
  --ink: #1f2937;
  --glass: rgba(255,255,255,.65);
  --brd: rgba(255,255,255,.55);
}

/* 레이아웃 */
.loading{
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: radial-gradient(1200px 700px at 10% 10%, var(--bg1) 0%, transparent 60%),
  radial-gradient(900px 600px at 90% 15%, var(--bg2) 0%, transparent 65%),
  linear-gradient(180deg, #f4f8ff 0%, #fef6fb 100%);
  color: var(--ink);
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}

/* 은은한 글로우 */
.glow{
  position:absolute; inset: -20%;
  pointer-events:none;
  filter: blur(40px);
  opacity:.35;
}
.glow-1{
  background: radial-gradient(800px 600px at 20% 70%, #ffd6e1, transparent 70%);
  animation: driftX 14s ease-in-out infinite alternate;
}
.glow-2{
  background: radial-gradient(700px 500px at 80% 30%, #d6f3ff, transparent 65%);
  animation: driftY 18s ease-in-out infinite alternate;
}
@keyframes driftX { 0%{transform:translateX(-12px)} 100%{transform:translateX(12px)} }
@keyframes driftY { 0%{transform:translateY(-10px)} 100%{transform:translateY(10px)} }

/* 아주 약한 그레인 */
.grain{
  position:absolute; inset:0; pointer-events:none; opacity:.055; mix-blend-mode:multiply;
  background-image: url("data:image/svg+xml,%3Csvg width='180' height='180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
  background-size: 280px 280px;
}

/* 중앙 카드 */
.card{
  position: relative;
  z-index: 2;
  width: min(86vw, 520px);
  padding: clamp(20px, 4vw, 28px);
  background: var(--glass);
  border: 1px solid var(--brd);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(31,41,55,.15);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  text-align: center;
}

/* 하트 링 */
.ring{
  display: grid;
  place-items: center;
  margin-bottom: 14px;
}
.ring-svg{
  width: 78px; height: 78px;
  display:block;
}
.ring-base{
  fill: none;
  stroke: rgba(255,255,255,.85);
  stroke-width: 10;
  filter: drop-shadow(0 4px 18px rgba(255,255,255,.35));
  opacity: .85;
}
.heart{
  fill: var(--accent);
  transform-origin: 60px 60px;
  animation: pulse 1200ms ease-in-out infinite;
  filter: drop-shadow(0 6px 16px rgba(255,138,163,.35));
}
@keyframes pulse{
  0%, 100% { transform: scale(1); }
  40%      { transform: scale(1.08); }
}

/* 텍스트 */
.title{
  margin: 6px 0 6px;
  color: #000000;
  font-weight: 900;
  font-size: clamp(18px, 3.8vw, 22px);
  letter-spacing: .2px;
}
.subtitle{
  margin: 0 0 14px;
  color: #475569;
  font-size: clamp(14px, 3.2vw, 16px);
}

/* 점 애니메이션 */
.dots{ display:inline-flex; gap:4px; margin-left: 4px; }
.dots i{
  width:6px; height:6px; border-radius:50%;
  background: currentColor; opacity:.65;
  display:inline-block; transform: translateY(0);
  animation: dot 1200ms ease-in-out infinite;
}
.dots i:nth-child(2){ animation-delay: .15s; }
.dots i:nth-child(3){ animation-delay: .30s; }
@keyframes dot{
  0%, 100% { opacity:.35; transform: translateY(0) }
  40%      { opacity:.85; transform: translateY(-2px) }
}

/* 프로그레스 (2초에 맞춰 채워짐) */
.progress{
  position: relative;
  height: 8px;
  width: 100%;
  border-radius: 999px;
  background: rgba(255,255,255,.55);
  overflow: hidden;
}
.bar{
  position:absolute; left:0; top:0; bottom:0;
  width: 0%;
  background: linear-gradient(90deg, #ff8aa3, #ffc2d0);
  border-radius: inherit;
  animation: fill 2s ease forwards;
  box-shadow: 0 6px 18px rgba(255,138,163,.35);
}
@keyframes fill{
  to { width: 100%; }
}

/* 모션 줄이기 환경 */
@media (prefers-reduced-motion: reduce){
  .glow-1, .glow-2,
  .heart,
  .dots i,
  .bar { animation: none !important; }
}
</style>