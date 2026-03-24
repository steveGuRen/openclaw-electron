import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createPinia } from 'pinia'
import { ElMessage } from 'element-plus'
import router from './router'
import App from './App.vue'
import electron from './utils/electron'
import './style.css'

// 提前检查electronAPI可用性
if (!electron.isAvailable) {
  console.error('electronAPI加载失败，应用无法正常运行')
  // 延迟显示错误提示，确保ElementPlus已加载
  setTimeout(() => {
    ElMessage.error('Electron API 加载失败，请重启应用')
  }, 1000)
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
