<template>
  <section class="page">
    <header class="hero" :style="{'--hero-url': `url('${heroUrl}')`}">
      <!-- 중앙 타이틀 -->
      <div class="hero-inner">
        <h1 class="title">결혼했습니다</h1>
        <p class="subtitle">우리의 시작을 기록합니다</p>
        <div class="date-tag">2024.06.05</div>
      </div>

      <!-- 슬라이드 (초기 1초간 숨김 → 부드럽게 등장) -->
      <div class="slides" :class="{ 'is-active': slidesActive }" aria-hidden="true">
        <div
            v-for="(s, i) in slides"
            :key="i"
            class="slide"
            :class="{
            show: slidesActive && i === shownIndex && !sucking,
            suck: slidesActive && i === shownIndex && sucking
          }"
        >
          <div class="frame">
            <img :src="s" alt="" />
          </div>
        </div>
      </div>

      <!-- 하단 플로팅 달력 -->
      <div ref="calRef" class="calendar-float" role="group" aria-label="2024년 6월 달력">
        <h2 class="cal-title">2024년 6월</h2>

        <div class="calendar">
          <div v-for="d in weekdays" :key="`h-${d}`" class="cell head">{{ d }}</div>
          <div v-for="n in firstWeekday" :key="`blank-${n}`" class="cell blank" aria-hidden="true" />
          <button
              v-for="day in daysInMonth"
              :key="`d-${day}`"
              class="cell day"
              :class="{ 'is-target': isTarget(day) }"
              :aria-current="isTarget(day) ? 'date' : undefined"
              :title="`2024-06-${String(day).padStart(2,'0')}`"
              type="button"
          >
            <span class="num">{{ day }}</span>
          </button>
        </div>
      </div>

      <div class="hero-fade" />
    </header>
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

/* -------------------------
   이미지 / 데이터
------------------------- */
const heroUrl = new URL('@/assets/photos/image-main.jpeg', import.meta.url).href
const slides = [
  new URL('@/assets/photos/image1.jpg', import.meta.url).href,
  new URL('@/assets/photos/image2.jpg', import.meta.url).href,
  new URL('@/assets/photos/image3.jpg', import.meta.url).href,
]

// 달력(2024-06)
const year = 2024
const month = 5
const targetDay = 5
const weekdays = ['일', '월', '화', '수', '목', '금', '토']
const firstWeekday = new Date(year, month, 1).getDay()
const daysInMonth = new Date(year, month + 1, 0).getDate()
const isTarget = (d) => d === targetDay

/* -------------------------
   슬라이드(초기 1초 지연) + 1초 사이클
   - SHOW_MS ~600ms 노출
   - SUCK_MS ~400ms 흡입
------------------------- */
const slidesActive = ref(false)   // ✅ 1초 뒤 활성화
const shownIndex   = ref(0)
const sucking      = ref(false)
let loopTimer = 0
let suckTimer = 0

const SHOW_MS = 1000
const SUCK_MS = 380
const INITIAL_DELAY_MS = 1000  // ✅ 첫 진입 지연

const calRef = ref(null)
function updateCalCssVars() {
  const el = calRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top  + r.height / 2
  const vw = window.innerWidth
  const vh = window.innerHeight
  document.documentElement.style.setProperty('--cal-x', `${(cx / vw) * 100}%`)
  document.documentElement.style.setProperty('--cal-y', `${(cy / vh) * 100}%`)
}

function startLoop(){
  stopLoop()
  updateCalCssVars()
  loopTimer = setInterval(() => {
    // 노출 → 흡입
    sucking.value = true
    clearTimeout(suckTimer)
    suckTimer = setTimeout(() => {
      sucking.value = false
      shownIndex.value = (shownIndex.value + 1) % slides.length
      updateCalCssVars()
    }, SUCK_MS)
  }, SHOW_MS + SUCK_MS)
}
function stopLoop(){
  clearInterval(loopTimer); loopTimer = 0
  clearTimeout(suckTimer);  suckTimer = 0
}

onMounted(() => {
  // ✅ 처음 1초 동안 슬라이드 비표시 → 자연스럽게 페이드인 후 시작
  setTimeout(() => {
    slidesActive.value = true
    startLoop()
  }, INITIAL_DELAY_MS)

  window.addEventListener('resize', updateCalCssVars)
  window.addEventListener('orientationchange', updateCalCssVars)
  updateCalCssVars()
})
onBeforeUnmount(() => {
  stopLoop()
  window.removeEventListener('resize', updateCalCssVars)
  window.removeEventListener('orientationchange', updateCalCssVars)
})

/* -------------------------
   위/아래 스와이프/휠 네비게이션(쿨다운 유지)
------------------------- */
const router = useRouter()
const goPrev = () => router.push('/flight')
const goNext = () => router.push('/gallery')

let navigating = false
let coolTimer = 0
const COOLDOWN_MS = 10000
const THRESH_TOUCH = 28
const THRESH_WHEEL = 10

let startY = 0
function onTouchStart(e){ startY = e.touches?.[0]?.clientY ?? 0 }
function onTouchMove(e){
  if (navigating) return
  const currY = e.touches?.[0]?.clientY ?? 0
  const dy = currY - startY
  if ((window.scrollY || 0) <= 0 && dy > THRESH_TOUCH) triggerNav(goPrev)
  if (dy < -THRESH_TOUCH) triggerNav(goNext)
}
function onWheel(e){
  if (navigating) return
  const y = window.scrollY || 0
  if (y <= 0 && e.deltaY < -THRESH_WHEEL) return triggerNav(goPrev)
  if (e.deltaY > THRESH_WHEEL)           return triggerNav(goNext)
}
function triggerNav(fn){
  if (navigating) return
  navigating = true
  fn()
  clearTimeout(coolTimer)
  coolTimer = setTimeout(() => { navigating = false }, COOLDOWN_MS)
}
onMounted(() => {
  document.documentElement.style.overscrollBehaviorY = 'none'
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove',  onTouchMove,  { passive: true })
  window.addEventListener('wheel',      onWheel,      { passive: true })
})
onBeforeUnmount(() => {
  document.documentElement.style.overscrollBehaviorY = ''
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove',  onTouchMove)
  window.removeEventListener('wheel',      onWheel)
  clearTimeout(coolTimer)
})
</script>

<style scoped>
/* 페이지 기본 */
.page { background:#000; color:#111; }

/* 히어로 */
.hero{
  position: relative;
  height: 100svh;
  background: var(--hero-url) center/cover no-repeat;
  overflow: hidden;
}
@supports (height: 100dvh){ .hero{ height: 100dvh; } }

/* 중앙 카피 */
.hero-inner{
  position:absolute; inset:0;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  text-align:center;
  padding: clamp(16px, 5vw, 32px);
  z-index: 5;
}
.title{
  color:#fff; margin:0;
  font-size: clamp(28px, 7vw, 48px);
  font-weight: 900; letter-spacing:.2px;
  text-shadow: 0 2px 16px rgba(0,0,0,.35);
}
.subtitle{
  color: rgba(255,255,255,.92);
  margin: 6px 0 10px;
  font-size: clamp(14px, 3.8vw, 18px);
  text-shadow: 0 2px 12px rgba(0,0,0,.35);
}
.date-tag{
  display:inline-block;
  background: rgba(255,255,255,.92);
  color:#111; font-weight:800;
  padding: 8px 14px; border-radius: 999px;
  box-shadow: 0 4px 18px rgba(0,0,0,.18);
}

/* 하단 그라데이션 */
.hero-fade{
  position:absolute; inset:0; z-index: 1;
  background: linear-gradient(180deg,
  rgba(0,0,0,.05) 0%,
  rgba(0,0,0,.20) 55%,
  rgba(0,0,0,.45) 85%,
  rgba(0,0,0,.55) 100%);
  pointer-events:none;
}

/* 플로팅 달력 */
.calendar-float{
  position:absolute; left:50%; transform:translateX(-50%);
  bottom: calc(18px + env(safe-area-inset-bottom));
  z-index: 3;
  width: min(85vw, 300px);
}
.cal-title{ margin: 2px 4px 10px; font-size:16px; font-weight:800; line-height:1.2; }
.calendar{
  --cell: 20px;
  display:grid; grid-template-columns: repeat(7, 1fr);
  gap: 4px; user-select:none;
}
.cell.head{
  height: var(--cell);
  font-weight: 700; font-size: 12px;
  display:grid; place-items:center; color:#475569;
}
.cell.blank, .cell.day{ height: var(--cell); border-radius: 10px; }
.cell.day{
  all: unset;
  display:grid; place-items:center;
  height: var(--cell);
  border-radius: 10px;
  background:#f7fafc; border:1px solid rgba(17,24,39,.05);
  font-weight:700; color:#111; font-size:14px;
  -webkit-tap-highlight-color: transparent;
}
.cell.day.is-target{
  background:#fff0f5; border-color:#ff8bb0;
  box-shadow:0 6px 18px rgba(255,139,176,.25);
  color:#b80c4f;
}
.cell.day .num{ font-size:14px; }

/* =========================
   슬라이드 + 프레임 (부드러운 모션)
   ========================= */
.slides{
  position:absolute; inset:0;
  z-index: 5;
  overflow: hidden;
  pointer-events: none;

  /* 초기 1초 동안 숨김 → 자연스럽게 등장 */
  opacity: 0;
  transition: opacity .5s ease;
}
.slides.is-active{ opacity: 1; }

/* 각 슬라이드 */
.slide {
  position: absolute; inset: 0;
  display:flex; align-items:center; justify-content:center;

  opacity: 0;
  transform: scale(.98);
  clip-path: circle(78% at 50% 50%);

  transition:
      opacity .42s cubic-bezier(.22,.61,.36,1),
      transform .62s cubic-bezier(.22,.61,.36,1),
      clip-path .62s cubic-bezier(.22,.61,.36,1),
      filter .42s ease;

  will-change: transform, opacity, clip-path, filter;
}

/* 액자 프레임 */
.frame {
  display: inline-block;              /* 내용(이미지) 크기에 맞춤 */
  background: #fff;                   /* 액자 배경 */
  border: 2px solid rgba(0,0,0,.12);  /* 테두리 */
  border-radius: 18px;
  padding: 8px;                       /* 액자 여백 */
  box-shadow: 0 12px 28px rgba(0,0,0,.25);
}

/* 이미지 */
.frame img {
  display: block;
  width: auto;        /* 원본 비율 유지 */
  height: auto;       /* 원본 비율 유지 */
  max-width: 90vw;    /* 화면 벗어나지 않도록 제한 */
  max-height: 80vh;   /* 화면 세로에 맞게 제한 */
  border-radius: 12px;
}


/* 등장(더 매끈한 easeOut) */
.slide.show {
  opacity: 1;
  transform: scale(1);
  clip-path: circle(80% at 50% 50%);
}

/* 흡입(더 부드러운 이징) */
.slide.suck {
  opacity: 0.06;  /* 거의 사라지되 완전 0 이전에 라스트 트레일 */
  transform-origin: var(--cal-x, 50%) var(--cal-y, 85%);
  transform: scale(0.18);
  clip-path: circle(0% at var(--cal-x, 50%) var(--cal-y, 85%));
  filter: blur(1px);

  transition:
      opacity .38s cubic-bezier(.22,.85,.36,1),
      transform .45s cubic-bezier(.22,.85,.36,1),
      clip-path .45s cubic-bezier(.22,.85,.36,1),
      filter .38s ease;
}
.slide.suck .frame{
  box-shadow: 0 6px 18px rgba(0,0,0,.22);
  opacity: .85;
}
</style>