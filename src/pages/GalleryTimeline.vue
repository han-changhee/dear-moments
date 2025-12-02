<template>
  <div class="gallery-wrapper">
    <section class="timeline" aria-label="우리의 이야기 타임라인">
      <h2 class="title">우리의 이야기</h2>

      <div class="line" aria-hidden="true"></div>

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

      <div
          v-if="messages.length"
          class="cyl-msg"
          @mouseenter="pauseRotation"
          @mouseleave="startRotation"
      >
        <div class="cyl-track">
          <div v-if="prevMessage" class="cyl-item prev" @click="goPrevMessage">
            <p class="txt">
              "{{ prevMessage.content }}"
              <span class="who">— {{ prevMessage.name || '익명' }}</span>
            </p>
          </div>

          <div v-if="currentMessage" class="cyl-item current">
            <p class="txt">
              "{{ currentMessage.content }}"
              <span class="who">— {{ currentMessage.name || '익명' }}</span>
            </p>
          </div>

          <div v-if="nextMessage" class="cyl-item next" @click="goNextMessage">
            <p class="txt">
              "{{ nextMessage.content }}"
              <span class="who">— {{ nextMessage.name || '익명' }}</span>
            </p>
          </div>
        </div>

        <div class="cyl-fade left" aria-hidden="true"></div>
        <div class="cyl-fade right" aria-hidden="true"></div>
      </div>

      <div class="cta-wrap">
        <button class="btn-cta" type="button" @click="openDialog">
          🎁 축하의 마음 전하기
        </button>
      </div>
    </section>

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

        <footer class="modal-foot">
          <button class="btn-close" type="button" @click="closeDialog">닫기</button>
        </footer>
      </div>

      <div v-if="toast" class="toast">{{ toast }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import axios from 'axios'

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
    img: '/api/photos/story_1.jpeg',
  },
  {
    date: '2020 - 2022 · 강제 이별',
    text: '예상치 못한 코로나로 서로를 멀리서 바라봐야 했던 시간, 그리움은 더 깊어졌습니다.<br>予期せぬコロナ禍で、互いを遠くから見つめるしかなかった時間、愛しさはより一層深まりました。',
    img: '/api/photos/story_2.jpeg',
  },
  {
    date: '2023 · 프로포즈',
    text: '길었던 기다림 끝, 함께 걸어갈 평생을 약속하며 행복의 시작을 맞이했어요.<br>長い時を経て、共に歩む生涯を誓い、幸せな門出を迎えることとなりました。',
    img: '/api/photos/story_3.jpeg',
  },
  {
    date: '2024 · 결혼',
    text: '이제는 하나의 길을 걸으며, 같은 하늘 아래 새로운 여정을 함께 이어갑니다.<br>これからは一つの道を歩み、同じ空の下、新たな旅路を共に歩んでまいります。',
    img: '/api/photos/story_4.jpeg',
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

/* ========= 네비 제스처 ========= */
const router = useRouter()
const goPrev = () => router.push('/main')

let navigating = false
let coolTimer = 0

// 터치용
let startY = 0
let lastTouchY = 0
let lastScrollY = 0
let stuckAtTop = false

// 휠용
let wheelStuckCount = 0
let wheelTimer = 0

function onTouchStart (e) {
  startY = e.touches?.[0]?.clientY ?? 0
  lastTouchY = startY
  lastScrollY = window.scrollY || 0
  stuckAtTop = false
}

function onTouchMove (e) {
  if (navigating) return

  const currentY = e.touches?.[0]?.clientY ?? 0
  const currentScrollY = window.scrollY || 0
  const dy = currentY - startY
  const touchDelta = currentY - lastTouchY   // 손가락 이동량
  const scrollDelta = currentScrollY - lastScrollY  // 스크롤 이동량

  // 최상단에서 손가락은 아래로 움직이는데 스크롤은 안 움직임 = 막힘
  if (currentScrollY <= 0 && touchDelta > 3 && Math.abs(scrollDelta) < 1) {
    stuckAtTop = true
  }

  // 막힌 상태에서 충분히 당기면 이동
  if (stuckAtTop && dy > THRESH_TOUCH) {
    triggerNav(goPrev)
  }

  lastTouchY = currentY
  lastScrollY = currentScrollY
}

function onWheel (e) {
  if (navigating) return

  const currentScrollY = window.scrollY || 0

  // 최상단에서 위로 휠하는데 스크롤이 안 움직이면 카운트 증가
  if (currentScrollY <= 0 && e.deltaY < -THRESH_WHEEL) {
    wheelStuckCount++
  } else {
    wheelStuckCount = 0
  }

  // 휠 세션 리셋 타이머
  clearTimeout(wheelTimer)
  wheelTimer = setTimeout(() => { wheelStuckCount = 0 }, 200)

  // 2번 이상 막히면 이동 (연속으로 휠해야 함)
  if (wheelStuckCount >= 2) {
    triggerNav(goPrev)
  }
}

function triggerNav (fn) {
  if (navigating) return
  navigating = true
  fn()
  clearTimeout(coolTimer)
  coolTimer = setTimeout(() => (navigating = false), COOLDOWN_MS)
}

/* ========= 모달 ========= */
const showDialog = ref(false)
const dialogCard = ref(null)
const toast = ref('')

function openDialog () {
  showDialog.value = true
  requestAnimationFrame(() => dialogCard.value?.focus())
  document.documentElement.style.overflow = 'hidden'
}
function closeDialog () {
  showDialog.value = false
  document.documentElement.style.overflow = ''
}

/* ========= 메시지: API 연동 + 회전 ========= */
const messages = ref([])
const currentIndex = ref(0)
const sending = ref(false)
let   rotationTimer = 0

const currentMessage = computed(() => messages.value[currentIndex.value] || { name: '로딩 중', content: '메시지를 불러오는 중입니다...' })
const prevIndex = computed(() =>
    messages.value.length ? (currentIndex.value - 1 + messages.value.length) % messages.value.length : -1
)
const nextIndex = computed(() =>
    messages.value.length ? (currentIndex.value + 1) % messages.value.length : -1
)
const prevMessage = computed(() => messages.value[prevIndex.value] || null)
const nextMessage = computed(() => messages.value[nextIndex.value] || null)

async function loadMessages() {
  try {
    const response = await axios.get('/api/messages');
    messages.value = response.data.sort((a, b) =>
        new Date(b.createTime) - new Date(a.createTime)
    );
    currentIndex.value = 0;
  } catch (error) {
    console.error('[API] GET error:', error);
    showToast('메시지를 불러오지 못했어요 😢');
  }
}

const newName = ref('')
const newText = ref('')

async function sendMessage() {
  if (!newText.value.trim()) {
    showToast('메시지를 입력해주세요');
    return;
  }

  sending.value = true;

  const payload = {
    name: newName.value.trim() || '익명',
    content: newText.value.trim(),
  };

  try {
    const response = await axios.post('/api/messages', payload);
    const savedMessage = response.data;

    messages.value.unshift(savedMessage);
    currentIndex.value = 0;

    newName.value = '';
    newText.value = '';
    showToast('메시지가 등록되었습니다 🎉');
  } catch (error) {
    console.error('[API] POST error:', error);
    showToast('전송 실패 😵');
  } finally {
    sending.value = false;
  }
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

  document.addEventListener('visibilitychange', onVisChange)

  await loadMessages()
  startRotation()
})

onBeforeUnmount(() => {
  io?.disconnect()

  document.documentElement.style.overscrollBehaviorY = ''
  document.documentElement.style.overflow = ''
  showDialog.value = false

  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove',  onTouchMove)
  window.removeEventListener('wheel',      onWheel)
  document.removeEventListener('visibilitychange', onVisChange)

  clearTimeout(coolTimer)
  clearTimeout(toastTimer)
  clearTimeout(wheelTimer)
  stopRotation()
})

onBeforeRouteLeave(() => {
  document.documentElement.style.overflow = ''
  showDialog.value = false
})

function onVisChange(){
  if (document.hidden) pauseRotation()
  else startRotation()
}
</script>

<style scoped>
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

.cta-wrap{ position: sticky; bottom: 24px; display:grid; place-items:center; margin-top: 18px; }
.btn-cta{
  min-height:44px; padding:12px 18px; border-radius:999px; border:0; font-weight:800; cursor:pointer;
  background:#ff8aa3; color:#111; box-shadow:0 10px 24px rgba(255,138,163,.35);
  transition: transform .15s ease, box-shadow .2s ease;
}
.btn-cta:active{ transform: translateY(1px); box-shadow:0 8px 18px rgba(255,138,163,.28); }

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

.msg-form input, .msg-form textarea{
  background:#fff !important; color:#111 !important; caret-color:#111;
}
.msg-form input::placeholder, .msg-form textarea::placeholder{ color:#94a3b8; opacity:1; }

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

.modal-foot{ display:flex; justify-content:flex-end; margin-top:20px; }
.btn-close{
  padding:10px 16px; border-radius:999px; border:0; background:#ff8aa3; color:#111; font-weight:800; cursor:pointer;
  box-shadow:0 6px 16px rgba(255,138,163,.35); transition: transform .15s ease, box-shadow .2s ease;
}
.btn-close:active{ transform: translateY(1px); box-shadow:0 4px 12px rgba(255,138,163,.25); }

.toast{
  position:fixed; left:50%; bottom:24px; transform:translateX(-50%);
  background:rgba(17,17,17,.95); color:#fff; padding:10px 14px; border-radius:999px; font-size:13px;
  box-shadow:0 10px 24px rgba(0,0,0,.25); animation:toastIn .18s ease;
}
@keyframes toastIn{ from{ transform:translate(-50%,6px); opacity:0 } to{ transform:translate(-50%,0); opacity:1 } }
</style>