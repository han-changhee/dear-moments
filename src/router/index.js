// // src/router/index.js
// import { createRouter, createWebHistory } from 'vue-router'
// import { ref } from 'vue'
//
// import FlightScrollGeo from '@/pages/FlightScrollGeo.vue'
// import WeddingMain from '@/pages/WeddingMain.vue'
// import GalleryTimeline from '@/pages/GalleryTimeline.vue'
// import LoadingPage from '@/pages/LoadingPage.vue'
//
// // ✅ 전환 방향 공유용 (forward | back)
// export const navDirection = ref('forward')
//
// const routes = [
//     { path: '/',        redirect: '/flight' },
//     { path: '/flight',  name: 'flight',  component: FlightScrollGeo,  meta: { index: 0 } },
//     { path: '/loading', name: 'loading', component: LoadingPage,      meta: { index: 0.5 } },
//     { path: '/main',    name: 'main',    component: WeddingMain,      meta: { index: 1 } },
//     { path: '/gallery', name: 'gallery', component: GalleryTimeline,  meta: { index: 2 } },
//     { path: '/:pathMatch(.*)*', redirect: '/flight' },
// ]
//
// export const router = createRouter({
//     history: createWebHistory(),
//     routes,
//     scrollBehavior() { return { left: 0, top: 0 } },
// })
//
// // ✅ 이동할 때 방향 계산 (index 기준)
// router.beforeEach(async (to, from, next) => {
//     const toIdx = to.meta.index ?? 0
//     const frIdx = from.meta.index ?? 0
//     navDirection.value = toIdx >= frIdx ? 'forward' : 'back'
//     next()
// })


// src/router/index.js
import { createRouter, createWebHashHistory } from 'vue-router'
import { ref } from 'vue'

import FlightScrollGeo from '@/pages/FlightScrollGeo.vue'
import WeddingMain from '@/pages/WeddingMain.vue'
import GalleryTimeline from '@/pages/GalleryTimeline.vue'
import LoadingPage from '@/pages/LoadingPage.vue'

export const navDirection = ref('forward')

const routes = [
    { path: '/',        redirect: '/flight' },
    { path: '/flight',  name: 'flight',  component: FlightScrollGeo,  meta: { index: 0 } },
    { path: '/loading', name: 'loading', component: LoadingPage,      meta: { index: 0.5 } },
    { path: '/main',    name: 'main',    component: WeddingMain,      meta: { index: 1 } },
    { path: '/gallery', name: 'gallery', component: GalleryTimeline,  meta: { index: 2 } },
    { path: '/:pathMatch(.*)*', redirect: '/flight' },
]

const router = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior() { return { left: 0, top: 0 } },
})

router.beforeEach((to, from, next) => {
    const toIdx = to.meta.index ?? 0
    const frIdx = from.meta.index ?? 0
    navDirection.value = toIdx >= frIdx ? 'forward' : 'back'
    next()
})

export default router