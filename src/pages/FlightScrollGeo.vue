<!-- src/pages/FlightScrollGeo.vue -->
<template>
  <section ref="scene" class="scene" @wheel.passive="onFirstInteract" @touchstart.passive="onFirstInteract">
    <div class="sticky">
      <svg
          class="stage"
          :viewBox="`0 0 ${W} ${H}`"
          preserveAspectRatio="xMidYMid slice"
          aria-label="Tokyo→Seoul flight (auto run)"
      >
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(255,255,255,.95)"/>
            <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
          </radialGradient>
        </defs>

        <!-- 지도(한반도+일본) -->
        <g :transform="mapTransform">
          <path v-if="jpPath" :d="jpPath" fill="#8ad9c0"/>
          <path v-if="krPath" :d="krPath" fill="#78d2b6"/>

          <!-- 경로 -->
          <path :d="routePath" stroke="rgba(0,0,0,.18)" stroke-width="2" fill="none" stroke-dasharray="6 8"/>
          <path :d="routePath" ref="progressEl" stroke="#ff6b9a" stroke-width="3"
                fill="none" stroke-linecap="round"
                :stroke-dasharray="totalLen" :stroke-dashoffset="dashOffset"/>

          <!-- 도시 핀 -->
          <g :transform="`translate(${tokyoPx[0]},${tokyoPx[1]})`">
            <circle r="10" fill="rgba(255,255,255,.95)"/>
            <circle r="24" fill="url(#glow)" opacity=".6"/>
            <text class="label dark" x="0" y="-18">사이타마 (埼玉県)</text>
          </g>
          <g :transform="`translate(${seoulPx[0]},${seoulPx[1]})`">
            <circle r="10" fill="rgba(255,255,255,.95)"/>
            <circle r="24" fill="url(#glow)" opacity=".6"/>
            <text class="label dark" x="0" y="-18">서울 (Seoul)</text>

            <!-- 서울 고정 아이콘 -->
            <image
                :href="CH_URL"
                :width="CH_W"
                :height="CH_H"
                :x="-(CH_W/2)"
                :y="-(CH_H)"
                preserveAspectRatio="xMidYMid meet"
            />
          </g>
        </g>

        <!-- 비행기 -->
        <g :transform="planeTransform" class="plane">
          <image
              :href="PLANE_URL"
              :width="PLANE_W"
              :height="PLANE_H"
              :x="-(PLANE_W/2)"
              :y="-(PLANE_H/2)"
              preserveAspectRatio="xMidYMid meet"
          />
        </g>
      </svg>

      <!-- 안내 텍스트(첫 상호작용 전) -->
      <div v-if="!started" class="hint">한 번 스크롤하거나 터치하면 출발합니다</div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { feature, merge } from 'topojson-client'
import { geoMercator, geoPath } from 'd3-geo'
import world from 'world-atlas/countries-50m.json'

const router = useRouter()

/* ---------- 설정값 ---------- */
const NEXT_ROUTE = '/loading'     // 자동 비행 후 이동할 경로
const DURATION_MS = 5000          // 자동 비행 시간(5초)
const HOLD_END_MS = 600           // 도착 후 잠깐 멈춤

/* ---------- 자원 ---------- */
const PLANE_W = 80, PLANE_H = 80
const PLANE_URL = 'http://58.121.126.75:28081/api/photos/ttang-fly.png'
const CH_W = 24, CH_H = 24
const CH_URL = 'http://58.121.126.75:28081/api/photos/ttung.png'
/* ---------- 크기/참조 ---------- */
const W = 1200, H = 800
const scene = ref(null)
const progressEl = ref(null)
const totalLen = ref(1)

/* ---------- 상태 ---------- */
const progress = ref(0)   // 0..1
const started = ref(false)
let animRaf = 0, animStart = 0
let navigateTimer = 0

/* ---------- 좌표 ---------- */
// 사이타마(埼玉県) 근처 (さいたま市 아님)
const TOKYO = [139.6489, 35.8617]
const SEOUL = [126.977969, 37.566535]

/* ---------- D3 투영 ---------- */
const projection = geoMercator().translate([W/2, H/2]).scale(1)
const pathGen = geoPath(projection)

/* ---------- 지오 ---------- */
let jpGeom, krGeom
const jpPath = ref(''), krPath = ref('')
const routePath = ref('')
const tokyoPx = ref([W/2, H/2])
const seoulPx = ref([W/2, H/2])

/* ---------- 비행기 ---------- */
const plane = reactive({ x: 0, y: 0, angle: 0 })
const dashOffset = computed(() => (1 - progress.value) * totalLen.value)
const mapTransform = computed(() => {
  // 진행률 기준으로 "줌/센터" 모션(기존 스크롤 로직을 time 기반으로만 사용)
  const t = progress.value
  const sTokyo = 2.6, sBoth = 1.12, sSeoul = 2.6
  const lerp = (a,b,t)=>a+(b-a)*t
  const ease = (x)=> x<.5 ? 2*x*x : 1 - Math.pow(-2*x+2,2)/2

  let centerLng, centerLat, scale
  if (t <= 0.35) {
    const k = ease(t/0.35)
    centerLng = lerp(TOKYO[0], (TOKYO[0]+SEOUL[0])/2, k)
    centerLat = lerp(TOKYO[1], (TOKYO[1]+SEOUL[1])/2, k)
    scale = lerp(sTokyo, sBoth, k)
  } else if (t <= 0.70) {
    centerLng = (TOKYO[0]+SEOUL[0])/2
    centerLat = (TOKYO[1]+SEOUL[1])/2
    scale = sBoth
  } else {
    const k = ease((t-0.70)/0.30)
    centerLng = lerp((TOKYO[0]+SEOUL[0])/2, SEOUL[0], k)
    centerLat = lerp((TOKYO[1]+SEOUL[1])/2, SEOUL[1], k)
    scale = lerp(sBoth, sSeoul, k)
  }

  const c = projection([centerLng, centerLat])
  return `translate(${W/2},${H/2}) scale(${scale}) translate(${-c[0]},${-c[1]})`
})
const planeTransform = computed(() => `${mapTransform.value} translate(${plane.x}, ${plane.y}) rotate(${plane.angle})`)

/* ---------- 유틸 ---------- */
const easeInOutCubic = (x) => (x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x+2, 3)/2)

function updatePlaneByProgress() {
  const path = progressEl.value
  if (!path) return
  const len = totalLen.value
  const dist = len * progress.value
  const pt = path.getPointAtLength(dist)
  const ahead = path.getPointAtLength(Math.min(dist + 1, len))
  plane.x = pt.x
  plane.y = pt.y
  plane.angle = 0
}

/* ---------- 빌드 ---------- */
function build() {
  const countries = feature(world, world.objects.countries).features
  const isId = (obj, n) => obj?.id === n || obj?.id === String(n)

  jpGeom = countries.find(f => isId(f, 392))
  const krMerged = merge(
      world,
      world.objects.countries.geometries.filter(g => isId(g, 408) || isId(g, 410))
  )
  krGeom = { type: 'Feature', geometry: krMerged }

  projection
    .center(TOKYO)
    .scale(2800)    // 일본 줌인 정도, 필요하면 숫자 조정
    .translate([W/2, H/2])

  jpPath.value = pathGen(jpGeom)
  krPath.value = pathGen(krGeom)

  tokyoPx.value = projection(TOKYO)
  seoulPx.value = projection(SEOUL)

  // 베지어 경로
  const [x1,y1] = tokyoPx.value
  const [x2,y2] = seoulPx.value
  const cx1 = (x1*2 + x2)/3, cy1 = y1 - 140
  const cx2 = (x1 + x2*2)/3, cy2 = y2 - 120
  routePath.value = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`

  // 길이 측정 후 초기위치 갱신
  setTimeout(() => {
    totalLen.value = progressEl.value?.getTotalLength?.() || 1
    updatePlaneByProgress()
  }, 0)
}

/* ---------- 자동 애니메이션 ---------- */
function startAutoFlight() {
  if (started.value) return
  started.value = true
  document.documentElement.style.overscrollBehavior = 'none' // 모바일 튕김 억제

  animStart = performance.now()
  const tick = (now) => {
    const elapsed = now - animStart
    const t = Math.min(1, elapsed / DURATION_MS)
    progress.value = easeInOutCubic(t)
    updatePlaneByProgress()

    if (t < 1) {
      animRaf = requestAnimationFrame(tick)
    } else {
      // 도착 잠시 유지 후 다음 페이지
      navigateTimer = setTimeout(() => {
        router.push(NEXT_ROUTE)
      }, HOLD_END_MS)
    }
  }
  animRaf = requestAnimationFrame(tick)
}

/* ---------- 트리거: 첫 상호작용 ---------- */
function onFirstInteract() {
  if (!started.value) startAutoFlight()
}

/* ---------- 라이프사이클 ---------- */
onMounted(() => {
  build()
  // 이미 스크롤이 살짝 된 상태에서도 바로 출발하도록 한번 체크(선택)
  setTimeout(() => { /* no-op */ }, 0)
})
onBeforeUnmount(() => {
  if (animRaf) cancelAnimationFrame(animRaf)
  clearTimeout(navigateTimer)
  document.documentElement.style.overscrollBehavior = ''
})
</script>

<style scoped>
/* 시퀀스 길이는 이제 시간 기반이므로 100svh로 OK */
.scene{
  height: 100svh;
  margin: 0; padding: 0;
  position: relative;
  background: linear-gradient(180deg, #cfe9ff 0%, #e9f5ff 70%, #eaf4ff 100%);
  overflow: clip;
}

/* 구름 레이어(옵션) */
.scene::before,
.scene::after{
  content:""; position:absolute; inset:0; pointer-events:none;
}
.scene::before{
  background:
      radial-gradient(1200px 500px at -10% 10%, rgba(255,255,255,.55), transparent 60%),
      radial-gradient(900px 380px  at 110% 20%, rgba(255,255,255,.45), transparent 65%),
      radial-gradient(800px 340px  at 30% 75%,  rgba(255,255,255,.35), transparent 70%);
  animation: drift1 60s ease-in-out infinite alternate; opacity:.8;
}
.scene::after{
  background:
      radial-gradient(900px 320px  at 60% 15%, rgba(255,255,255,.35), transparent 65%),
      radial-gradient(700px 260px  at 20% 85%, rgba(255,255,255,.30), transparent 70%);
  animation: drift2 90s ease-in-out infinite alternate; opacity:.7;
}
@keyframes drift1{ 0%{transform:translateY(-10px)} 100%{transform:translateY(10px)} }
@keyframes drift2{ 0%{transform:translateX(-12px)} 100%{transform:translateX(12px)} }

/* 뷰포트 고정 */
.sticky{
  position: sticky; top: 0;
  min-height: 100svh; width: 100%;
  display: grid; place-items: stretch;
}

/* SVG 풀스크린 */
.stage{
  width: 100svw; height: 100svh; display:block;
  border: none; border-radius: 0; box-shadow: none;
}

/* 라벨/비행기 */
.label{ font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size:14px; text-anchor: middle; }
.label.dark{ fill:#1f2937; }
.plane{ filter: drop-shadow(0 2px 6px rgba(0,0,0,.15)); }

/* 첫 인터랙션 안내 */
.hint{
  position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%);
  padding: 10px 14px; border-radius: 999px;
  background: rgba(255,255,255,.95); color:#111; font-weight:800;
  box-shadow: 0 10px 24px rgba(0,0,0,.18);
  font-size: 13px;
  pointer-events: none;
}
</style>
