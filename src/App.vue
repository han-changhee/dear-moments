<!-- src/App.vue -->
<template>
  <RouterView />
</template>

<!--<script setup>-->
<!--import { RouterView } from 'vue-router'-->

<!--// 혹시 이전에 남아있던 스크롤 잠금이 있으면 풀기-->
<!--if (typeof document !== 'undefined') {-->
<!--  const de = document.documentElement-->
<!--  de.style.overflow = ''-->
<!--  de.style.overscrollBehaviorY = ''-->
<!--}-->
<!--</script>-->

<!--<style>-->
<!--html, body, #app { height: 100%; }-->
<!--</style>-->



<!--<template>-->
<!--  <RouterView v-slot="{ Component, route }">-->
<!--    <Transition :name="transitionName" mode="out-in">-->
<!--      <component :is="Component" :key="route.fullPath" />-->
<!--    </Transition>-->
<!--  </RouterView>-->
<!--</template>-->

<script setup>
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { navDirection } from '@/router'

const transitionName = computed(() =>
    navDirection.value === 'forward' ? 'slide-left' : 'slide-right'
)
</script>

<style>
/* 페이지 전환: 부드러운 슬라이드 + 페이드 */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: opacity .32s ease, transform .32s ease;
  will-change: opacity, transform;
}
.slide-left-enter-from  { opacity: 0; transform: translateX(20px); }
.slide-left-leave-to    { opacity: 0; transform: translateX(-20px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-20px); }
.slide-right-leave-to   { opacity: 0; transform: translateX(20px); }
</style>

