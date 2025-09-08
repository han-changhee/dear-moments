import { createApp } from 'vue'
import App from './App.vue'
import router from '@/router'

// 전역 스타일 (리셋 + 유틸 + 컴포넌트 공용)
import '@/assets/styles/base.css'
import '@/assets/styles/util.css'

createApp(App).use(router).mount('#app')