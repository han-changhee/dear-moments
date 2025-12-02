<template>
  <RouterView v-slot="{ Component, route }">
    <Transition :name="transitionName" mode="out-in">
      <component :is="Component" :key="route.fullPath" />
    </Transition>
  </RouterView>
</template>

<script setup>
import { computed } from 'vue'
import { RouterView } from 'vue-router'
// 이전 router/index.js에서 export한 navDirection을 가져옴
import { navDirection } from '@/router'

const transitionName = computed(() =>
    // navDirection 값에 따라 애니메이션 클래스 이름을 동적으로 결정
    navDirection.value === 'forward' ? 'slide-left' : 'slide-right'
)

// 혹시 이전에 남아있던 스크롤 잠금이 있으면 풀기 (선택적)
if (typeof document !== 'undefined') {
  const de = document.documentElement
  de.style.overflow = ''
  de.style.overscrollBehaviorY = ''
}
</script>

<style>
html, body, #app { height: 100%; }

/* 페이지 전환: 부드러운 슬라이드 + 페이드 */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  /* 페이지가 동시에 전환될 때 position: absolute; 를 사용하여 겹치도록 설정하는 것이 일반적이나,
     현재는 transform/opacity로 처리하고 있으며 mode="out-in"을 사용합니다.
     duration(0.32s)이 짧고 transition이 부드러워 괜찮을 수 있습니다. */
  transition: opacity .32s ease, transform .32s ease;
  will-change: opacity, transform;
}
.slide-left-enter-from  { opacity: 0; transform: translateX(20px); }
.slide-left-leave-to    { opacity: 0; transform: translateX(-20px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-20px); }
.slide-right-leave-to   { opacity: 0; transform: translateX(20px); }
</style>