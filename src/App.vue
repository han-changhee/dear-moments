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