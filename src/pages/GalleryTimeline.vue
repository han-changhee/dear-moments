<!-- src/pages/GalleryTimeline.vue -->
<template>
  <section class="timeline" aria-label="우리의 이야기 타임라인">
    <h2 class="title">우리의 이야기</h2>

    <div class="line" aria-hidden="true"></div>

    <!-- 타임라인 -->
    <article
        v-for="(ev, i) in events"
        :key="i"
        class="item reveal"
        :class="i % 2 ? 'right' : 'left'"
    >
      <div class="content">
        <h3 class="date">{{ ev.date }}</h3>
        <p class="desc" v-html="ev.text"></p>
      </div>
      <figure class="shot">
        <img :src="ev.img" :alt="ev.text" decoding="async" loading="lazy" />
      </figure>
    </article>

    <!-- 실린더 캐러셀 (실시간 메시지) -->
    <div
        v-if="messages.length"
        class="cyl-msg"
        @mouseenter="pauseRotation"
        @mouseleave="startRotation"
    >
      <div class="cyl-track">
        <div v-if="prevMessage" class="cyl-item prev" @click="goPrevMessage">
          <p class="txt">
            “{{ prevMessage.text }}”
            <span class="who">— {{ prevMessage.name || '익명' }}</span>
          </p>
        </div>

        <div v-if="currentMessage" class="cyl-item current">
          <p class="txt">
            “{{ currentMessage.text }}”
            <span class="who">— {{ currentMessage.name || '익명' }}</span>
          </p>
        </div>

        <div v-if="nextMessage" class="cyl-item next" @click="goNextMessage">
          <p class="txt">
            “{{ nextMessage.text }}”
            <span class="who">— {{ nextMessage.name || '익명' }}</span>
          </p>
        </div>
      </div>

      <!-- 가장자리 페이드 -->
      <div class="cyl-fade left" aria-hidden="true"></div>
      <div class="cyl-fade right" aria-hidden="true"></div>
    </div>

    <!-- CTA -->
    <div class="cta-wrap">
      <button class="btn-cta" type="button" @click="openDialog">
        🎁 축하의 마음 전하기
      </button>
    </div>
  </section>

  <!-- 모달 -->
  <div
      v-if="showDialog"
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gift-title"
      @keydown.esc="closeDialog"
      @click.self="closeDialog"
  >
    <div class="modal-card" ref="dialogCard" tabindex="-1">
      <header class="modal-head">
        <h3 id="gift-title">💌 축하의 마음 전하는 곳</h3>
        <button class="icon-btn" type="button" @click="closeDialog" aria-label="닫기">✕</button>
      </header>

      <!-- 메시지 폼 -->
      <div class="msg-form">
        <h4 class="form-title">✨ 메시지 남기기</h4>

        <label for="msgName">성함 (선택)</label>
        <input
            id="msgName"
            v-model="newName"
            type="text"
            autocomplete="name"
            placeholder="이름을 적어주세요"
        />

        <label for="msgText">메시지</label>
        <textarea
            id="msgText"
            v-model="newText"
            rows="3"
            maxlength="120"
            placeholder="축하 메시지를 남겨주세요 (최대 120자)"
        ></textarea>

        <button class="btn-send" type="button" :disabled="sending" @click="sendMessage">
          {{ sending ? '전송 중...' : '메시지 남기기' }}
        </button>
      </div>

      <p class="modal-sub divider">
        따뜻한 마음만으로도 충분해요.<br />
        그래도 전하고 싶으시다면 아래로 부탁드립니다. 🙏
      </p>

      <!-- 얇은 계좌 리스트 (한 줄) -->
      <ul class="acct-list">
        <li v-for="(a, idx) in accounts" :key="idx" class="acct">
          <span class="acct-line">
            <strong class="who">{{ a.holder }}</strong>
            <span class="bank">{{ a.bank }}</span>
            <span class="number">{{ a.number }}</span>
          </span>
          <button class="copy-btn" type="button" @click="copyDigits(a.number)">복사</button>
        </li>
      </ul>

      <footer class="modal-foot">
        <button class="btn-close" type="button" @click="closeDialog">닫기</button>
      </footer>
    </div>

    <!-- 토스트 -->
    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
/**
 * ✅ 리팩토링 포인트
 * - Supabase v2 클라이언트 구성 (env: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 * - 초기 로딩(loadFromSupabase) + 실시간 구독(subscribeRealtime)
 * - 삽입 성공 시 realtime INSERT로 목록 자동 반영
 * - /main 제스처 복귀 시 스크롤 잠금/채널/타이머/모달 안전 정리
 * - visibilitychange로 탭 비활성 시 회전 일시정지(선택사항)
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { createClient } from '@supabase/supabase-js'


/* ========= Supabase ========= */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const TABLE_NAME   = 'messages' // id, name, text, created_at

const supabase =
    SUPABASE_URL && SUPABASE_KEY
        ? createClient(SUPABASE_URL, SUPABASE_KEY)
        : null

/* ========= 상수 ========= */
const ROLL_INTERVAL = 2500
const COOLDOWN_MS   = 1200
const THRESH_TOUCH  = 28
const THRESH_WHEEL  = 10

/* ========= 타임라인 데이터 ========= */
const events = [
  {
    date: '2019 · 첫 만남 · 初めての出会い',
    text: '여름 햇살 가득한 전주에서 처음 마주한 순간, 두 사람의 이야기가 시작되었어요.<br>夏の陽射しが降り注ぐ全州で初めて出会った瞬間、二人の物語が始まりました。',
    img: 'http://58.121.126.75:28081/api/photos/story_1.jpeg',
  },
  {
    date: '2020 - 2022 · 강제 이별',
    text: '예상치 못한 코로나로 서로를 멀리서 바라봐야 했던 시간, 그리움은 더 깊어졌습니다.',
    img: 'http://58.121.126.75:28081/api/photos/story_1.jpeg',
  },
  {
    date: '2023 · 프로포즈',
    text: '길었던 기다림 끝, 함께 걸어갈 평생을 약속하며 행복의 시작을 맞이했어요.',
    img: 'http://58.121.126.75:28081/api/photos/story_1.jpeg',
  },
  {
    date: '2024 · 결혼',
    text: '이제는 하나의 길을 걸으며, 같은 하늘 아래 새로운 여정을 함께 이어갑니다.',
    img: 'http://58.121.126.75:28081/api/photos/story_1.jpeg',
  },
]

/* ========= 스크롤 리빌 ========= */
let io
function mountObserver () {
  const targets = document.querySelectorAll('.reveal')
  io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        })
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.2 }
  )
  targets.forEach(el => io.observe(el))
}

/* ========= 네비 제스처(위로 올리면 /main) ========= */
const router = useRouter()
const goPrev = () => router.push('/main')

let navigating = false
let coolTimer = 0
let startY = 0
function onTouchStart (e) { startY = e.touches?.[0]?.clientY ?? 0 }
function onTouchMove (e) {
  if (navigating) return
  const dy = (e.touches?.[0]?.clientY ?? 0) - startY
  if ((window.scrollY || 0) <= 0 && dy > THRESH_TOUCH) triggerNav(goPrev)
}
function onWheel (e) {
  if (navigating) return
  if ((window.scrollY || 0) <= 0 && e.deltaY < -THRESH_WHEEL) triggerNav(goPrev)
}
function triggerNav (fn) {
  if (navigating) return
  navigating = true
  fn()
  clearTimeout(coolTimer)
  coolTimer = setTimeout(() => (navigating = false), COOLDOWN_MS)
}

/* ========= 모달/복사 ========= */
const showDialog = ref(false)
const dialogCard = ref(null)
const toast = ref('')

const accounts = [
  { holder: '신랑 · 한창희',       bank: '카카오뱅크', number: '3333-07-8920528' },
  { holder: '신부 · 키무라 에미코', bank: '농협',   number: '' },
]

function openDialog () {
  showDialog.value = true
  requestAnimationFrame(() => dialogCard.value?.focus())
  document.documentElement.style.overflow = 'hidden'
}
function closeDialog () {
  showDialog.value = false
  document.documentElement.style.overflow = ''
}
function copyDigits (raw) {
  const onlyDigits = (raw || '').replace(/\D/g, '')
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(onlyDigits).then(() => showToast(`복사됨: ${onlyDigits}`))
  } else {
    const ta = document.createElement('textarea')
    ta.value = onlyDigits
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy'); showToast(`복사됨: ${onlyDigits}`) }
    catch { showToast('복사 실패 😵') }
    document.body.removeChild(ta)
  }
}

/* ========= 메시지: Supabase 실시간 + 회전 ========= */
const messages = ref([])          // [{id, name, text, created_at}]
const currentIndex = ref(0)
const sending = ref(false)
let   rotationTimer = 0
let   realtimeChannel = null

const currentMessage = computed(() => messages.value[currentIndex.value] || null)
const prevIndex = computed(() =>
    messages.value.length ? (currentIndex.value - 1 + messages.value.length) % messages.value.length : -1
)
const nextIndex = computed(() =>
    messages.value.length ? (currentIndex.value + 1) % messages.value.length : -1
)
const prevMessage = computed(() => messages.value[prevIndex.value] || null)
const nextMessage = computed(() => messages.value[nextIndex.value] || null)

async function loadFromSupabase () {

  if (!supabase) {
    console.warn('[supabase] env가 비어 있음. 실시간/원격 로드 비활성')
    return
  }
  const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id, name, text, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
  if (error) {
    console.error('[supabase] select error:', error)
    showToast('메시지를 불러오지 못했어요 😢')
    return
  }
  messages.value = data || []
  currentIndex.value = 0
}

/** 실시간 구독 (INSERT) */
function subscribeRealtime () {
  if (!supabase) return
  // 중복 구독 방지
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
  realtimeChannel = supabase
      .channel(`public:${TABLE_NAME}`)
      .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: TABLE_NAME },
          payload => {
            const row = payload.new
            // 같은 id가 이미 있으면 중복 삽입 방지
            if (!messages.value.some(m => m.id === row.id)) {
              messages.value.unshift(row)
              currentIndex.value = 0
            }
          }
      )
      .subscribe((status) => {
        // 'SUBSCRIBED'가 되면 정상
        // console.log('realtime status:', status)
      })
}

function startRotation () {
  stopRotation()
  if (!messages.value.length) return
  rotationTimer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % messages.value.length
  }, ROLL_INTERVAL)
}
function pauseRotation () { stopRotation() }
function stopRotation () { clearInterval(rotationTimer); rotationTimer = 0 }
function goPrevMessage () {
  if (!messages.value.length) return
  currentIndex.value = (currentIndex.value - 1 + messages.value.length) % messages.value.length
}
function goNextMessage () {
  if (!messages.value.length) return
  currentIndex.value = (currentIndex.value + 1) % messages.value.length
}

/** 메시지 전송 (Supabase insert) */
const newName = ref('')
const newText = ref('')
async function sendMessage () {
  if (!newText.value.trim()) {
    showToast('메시지를 입력해주세요')
    return
  }
  if (!supabase) {
    showToast('실시간 서버 설정이 필요해요(환경변수 확인)')
    return
  }
  sending.value = true
  const payload = {
    name: newName.value.trim() || null,
    text: newText.value.trim(),
  }
  const { error } = await supabase.from(TABLE_NAME).insert(payload)
  sending.value = false

  if (error) {
    console.error('[supabase] insert error:', error)
    showToast('전송 실패 😵')
    return
  }
  // 성공 → 폼 초기화 (목록 반영은 realtime INSERT가 수행)
  newName.value = ''
  newText.value = ''
  showToast('메시지가 등록되었습니다 🎉')
}

/* ========= 토스트 ========= */
let toastTimer = 0
function showToast (msg) {
  clearTimeout(toastTimer)
  toast.value = msg
  toastTimer = setTimeout(() => (toast.value = ''), 1500)
}

/* ========= 라이프사이클 ========= */
onMounted(async () => {
  mountObserver()
  document.documentElement.style.overscrollBehaviorY = 'none'
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove',  onTouchMove,  { passive: true })
  window.addEventListener('wheel',      onWheel,      { passive: true })

  // 탭 비활성 시 자동 회전 일시정지(선택)
  document.addEventListener('visibilitychange', onVisChange)

  if (supabase) {
    await loadFromSupabase()
    subscribeRealtime()
  }
  startRotation()
})

onBeforeUnmount(() => {
  io?.disconnect()

  // ✅ 잠금/모달/타이머 정리
  document.documentElement.style.overscrollBehaviorY = ''
  document.documentElement.style.overflow = ''
  showDialog.value = false

  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove',  onTouchMove)
  window.removeEventListener('wheel',      onWheel)
  document.removeEventListener('visibilitychange', onVisChange)

  clearTimeout(coolTimer)
  clearTimeout(toastTimer)
  stopRotation()

  // ✅ 실시간 구독 해제
  if (supabase && realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
})

/** 라우트 떠날 때도 안전정리 (이전 페이지로 돌아갈 때 화면 안 나오는 문제 방지) */
onBeforeRouteLeave(() => {
  document.documentElement.style.overflow = ''
  showDialog.value = false
})

/* 탭 전환 시 자동 회전 제어(선택) */
function onVisChange(){
  if (document.hidden) pauseRotation()
  else startRotation()
}
</script>

<style scoped>
/* ===== 페이지/타이틀/라인 ===== */
.timeline{
  position: relative;
  min-height: 100svh;
  width: min(92vw, 980px);
  margin: 0 auto;
  padding: clamp(24px, 5vh, 56px) 0 clamp(80px, 12vh, 140px);
}
.title{
  text-align:center;
  font-weight:900;
  font-size: clamp(22px, 4.5vw, 34px);
  margin: 0 0 28px;
}
.line{
  position:absolute; top:0; bottom:0; left:50%;
  width:2px; background: rgba(0,0,0,.12);
  transform: translateX(-50%);
}

/* ===== 타임라인 아이템 ===== */
.item{
  display:grid;
  grid-template-columns: 1fr 1fr;
  align-items:center;
  gap: clamp(16px, 3vw, 28px);
  margin: clamp(28px, 7vh, 64px) 0;
  opacity: 0; transform: translateY(24px);
  transition: opacity .6s ease, transform .6s ease;
  will-change: transform, opacity;
}
.item.is-visible{ opacity: 1; transform: translateY(0); }
.item.left .content{ order:1; text-align:right; padding-right: 32px; }
.item.left .shot{ order:2; }
.item.right .content{ order:2; text-align:left; padding-left: 32px; }
.item.right .shot{ order:1; }
.shot{ margin:0; }
.shot img{ width:100%; height:auto; display:block; border-radius:16px; box-shadow:0 12px 28px rgba(0,0,0,.14); }
.date{ margin:0 0 8px; font-weight:900; color: #ff8bb0; font-size:clamp(16px, 2.5vw, 20px); }
.desc{ margin:0; color:#374151; font-size:clamp(14px, 2.3vw, 16px); line-height:1.6; }

@media (max-width: 860px){
  .line{ left: 18px; }
  .item{ grid-template-columns: 1fr; margin-left: 36px; }
  .item.left .content, .item.right .content{ order:2; text-align:left; padding:0; }
  .item.left .shot, .item.right .shot{ order:1; }
}

/* ===== CTA ===== */
.cta-wrap{ position: sticky; bottom: 24px; display:grid; place-items:center; margin-top: 18px; }
.btn-cta{
  min-height:44px; padding:12px 18px; border-radius:999px; border:0; font-weight:800; cursor:pointer;
  background:#ff8aa3; color:#111; box-shadow:0 10px 24px rgba(255,138,163,.35);
  transition: transform .15s ease, box-shadow .2s ease;
}
.btn-cta:active{ transform: translateY(1px); box-shadow:0 8px 18px rgba(255,138,163,.28); }

/* ===== 모달 ===== */
.modal{ position:fixed; inset:0; display:grid; place-items:center; background:rgba(0,0,0,.45); backdrop-filter:blur(4px); z-index:999; }
.modal-card{
  width:min(92vw,560px); background:#fff; color:#111; border-radius:20px; border:1px solid rgba(0,0,0,.08);
  box-shadow:0 24px 60px rgba(0,0,0,.25); padding:22px; outline:none; animation:pop .25s ease;
  font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}
@keyframes pop { from{ transform: translateY(8px); opacity:0 } to{ transform:none; opacity:1 } }
.modal-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
.modal-head h3{ margin:0; font-size:20px; font-weight:900; color:#b80c4f; }
.icon-btn{ border:0; background:transparent; font-size:20px; line-height:1; cursor:pointer; opacity:.6; }
.icon-btn:hover{ opacity:1; }
.modal-sub{ margin:10px 0 14px; color:#475569; font-size:14px; }

/* 메시지 폼 */
.msg-form{
  margin:12px 0 20px; padding:16px; border-radius:16px; background:#fff5f7; border:1px solid rgba(255,138,163,.25);
  display:grid; gap:10px;
}
.msg-form .form-title{ margin:0 0 6px; font-size:15px; font-weight:800; color:#b80c4f; }
.msg-form label{ font-size:13px; color:#555; }
.msg-form input, .msg-form textarea{
  width:100%; border:1px solid rgba(0,0,0,.12); border-radius:12px; padding:10px; font-size:14px; background:#fff;
  transition:border-color .2s ease;
}
.msg-form input:focus, .msg-form textarea:focus{ border-color:#ff8aa3; outline:none; }
.btn-send{
  padding:10px 14px; border-radius:12px; border:0; background:linear-gradient(135deg, #ff8aa3, #ffb6c1);
  color:#111; font-weight:800; cursor:pointer; transition: transform .15s ease, box-shadow .2s ease;
}
.btn-send:hover{ box-shadow:0 4px 12px rgba(255,138,163,.3); }
.btn-send:active{ transform: translateY(1px); }

/* 입력 중 글자/캐럿 */
.msg-form input, .msg-form textarea{
  background:#fff !important; color:#111 !important; caret-color:#111;
}
.msg-form input::placeholder, .msg-form textarea::placeholder{ color:#94a3b8; opacity:1; }

/* ===== 실린더 캐러셀 ===== */
.cyl-msg{
  position: relative;
  margin: 26px auto 6px;
  width: min(920px, 92%);
  height: 64px;
  perspective: 800px;
  overflow: hidden;
}
.cyl-track{
  position: absolute; inset: 0;
  transform-style: preserve-3d;
  display:grid; grid-template-columns: 1fr;
  place-items:center;
}
.cyl-item{
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  max-width: 920px;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 14px;
  background: rgba(255,255,255,.92);
  border: 1px solid rgba(0,0,0,.06);
  box-shadow: 0 10px 24px rgba(0,0,0,.10);
  transition: transform .6s cubic-bezier(.22,.61,.36,1), opacity .6s ease, filter .6s ease;
  will-change: transform, opacity, filter;
  cursor: default;
}
.cyl-item .txt{
  margin:0; color:#111; font-size:14px; text-align:center;
  white-space: nowrap; overflow:hidden; text-overflow: ellipsis;
}
.cyl-item .who{ margin-left: 6px; font-size:12px; color:#64748b }
.cyl-item.current{
  transform: translate(-50%, -50%) translateZ(60px) rotateY(0deg) scale(1);
  opacity: 1; filter: none;
}
.cyl-item.prev{
  transform: translate(calc(-50% - 35%), -50%) rotateY(22deg) translateZ(-40px) scale(.94);
  opacity: .55; filter: blur(.6px); cursor: pointer;
}
cyl-item.next,
.cyl-item.next{
  transform: translate(calc(-50% + 35%), -50%) rotateY(-22deg) translateZ(-40px) scale(.94);
  opacity: .55; filter: blur(.6px); cursor: pointer;
}
.cyl-fade{
  position:absolute; top:0; bottom:0; width:16%;
  pointer-events:none;
}
.cyl-fade.left{  left:0;  background: linear-gradient(to right, rgba(255,255,255,1), rgba(255,255,255,0)); }
.cyl-fade.right{ right:0; background: linear-gradient(to left,  rgba(255,255,255,1), rgba(255,255,255,0)); }

/* 다크 대응(옵션) */
:where(.page, .timeline)[data-dark] .cyl-item,
:where(.page, .timeline).dark .cyl-item{
  background: rgba(17,17,17,.92);
  border-color: rgba(255,255,255,.08);
}
:where(.page, .timeline)[data-dark] .cyl-item .txt,
:where(.page, .timeline).dark .cyl-item .txt{ color:#fff }
:where(.page, .timeline)[data-dark] .cyl-fade.left{
  background: linear-gradient(to right, rgba(17,17,17,1), rgba(17,17,17,0));
}
:where(.page, .timeline)[data-dark] .cyl-fade.right{
  background: linear-gradient(to left, rgba(17,17,17,1), rgba(17,17,17,0));
}

/* 구분선 */
.divider{ text-align:center; margin:18px 0; font-size:13px; color:#64748b; border-top:1px dashed rgba(0,0,0,.1); padding-top:14px; }

/* 계좌 리스트 (얇게 + 한 줄) */
.acct-list{ list-style:none; padding:0; margin:0; display:grid; gap:8px; }
.acct{
  display:flex; justify-content:space-between; align-items:center;
  padding:8px 10px; border-radius:10px; background:#f9fafb; border:1px solid rgba(0,0,0,.05);
}
.acct-line{ display:flex; flex-wrap:wrap; gap:6px; align-items:baseline; }
.acct .who{ font-weight:700; font-size:13px; }
.acct .bank{ font-size:12px; color:#64748b; }
.acct .number{ font-family:ui-monospace, Menlo, Consolas, monospace; font-size:12px; color:#111; }
.copy-btn{
  padding:4px 10px; font-size:12px; border-radius:999px; border:0; background:#111; color:#fff; font-weight:700; cursor:pointer;
  transition: background .2s ease;
}
.copy-btn:hover{ background:#333; }

/* 닫기 버튼(오른쪽 하단 살짝 바깥) */
.modal-foot{ display:flex; justify-content:flex-end; margin-top:20px; position:relative; height:50px; }
.btn-close{
  position:absolute; right:10px; bottom:-10px;
  padding:10px 16px; border-radius:999px; border:0; background:#ff8aa3; color:#111; font-weight:800; cursor:pointer;
  box-shadow:0 6px 16px rgba(255,138,163,.35); transition: transform .15s ease, box-shadow .2s ease;
}
.btn-close:active{ transform: translateY(1px); box-shadow:0 4px 12px rgba(255,138,163,.25); }

/* 토스트 */
.toast{
  position:fixed; left:50%; bottom:24px; transform:translateX(-50%);
  background:rgba(17,17,17,.95); color:#fff; padding:10px 14px; border-radius:999px; font-size:13px;
  box-shadow:0 10px 24px rgba(0,0,0,.25); animation:toastIn .18s ease;
}
@keyframes toastIn{ from{ transform:translate(-50%,6px); opacity:0 } to{ transform:translate(-50%,0); opacity:1 } }
</style>