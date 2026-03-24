<template>
  <Layout>
    <div class="deps-install-page">
      <div class="install-container">
        <div class="install-header">
          <h2>环境检测与依赖安装</h2>
          <p>正在检测系统环境并安装所需依赖，请耐心等待...</p>
        </div>

        <!-- 进度条 -->
        <ProgressBar
          :current-step="currentStep"
          :total-steps="totalSteps"
          :step-name="stepName"
          :percentage="percentage"
        />

        <!-- 错误提示 -->
        <ErrorTip
          v-if="installError"
          title="依赖安装失败"
          :description="installError.message"
          :detail="installError.detail"
          class="error-tip"
        />

        <!-- 日志查看器 -->
        <LogViewer :logs="logs" @clear="handleClearLogs" />

        <!-- 操作按钮 -->
        <div class="install-actions">
          <el-button
            v-if="installStatus === 'error'"
            type="primary"
            size="large"
            @click="handleRetry"
            :loading="loading"
          >
            重试安装
          </el-button>
          <el-button
            v-else-if="installStatus === 'success'"
            type="primary"
            size="large"
            @click="handleNext"
          >
            下一步
          </el-button>
          <el-button
            v-else
            size="large"
            @click="handleCancel"
            :disabled="loading"
          >
            取消
          </el-button>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAppStore } from '../store'
import Layout from '../components/Layout.vue'
import ProgressBar from '../components/ProgressBar.vue'
import LogViewer from '../components/LogViewer.vue'
import ErrorTip from '../components/ErrorTip.vue'
import electron from '../utils/electron'

const router = useRouter()
const appStore = useAppStore()

const loading = ref(false)
const installStatus = ref<'idle' | 'running' | 'success' | 'error'>('idle')
const installError = ref<{ message: string; detail: string } | null>(null)

// 进度相关
const currentStep = ref(1)
const totalSteps = ref(4)
const stepName = ref('环境检测中')
const percentage = ref(0)

// 日志
const logs = ref([])
// 事件移除函数
const removeListeners = ref([])

const addLog = (type, content) => {
  logs.value.push({
    type,
    content,
    timestamp: new Date()
  })
  appStore.addLog({ type, content })
}

const handleClearLogs = () => {
  logs.value = []
}

// 事件处理函数
const handleDepsProgress = (data) => {
  currentStep.value = data.step
  stepName.value = data.stepName
  percentage.value = data.percentage
}

const handleDepsLog = (data) => {
  addLog(data.type, data.content)
}

const handleDepsSuccess = () => {
  installStatus.value = 'success'
  percentage.value = 100
  addLog('info', '依赖安装完成')
  ElMessage.success('环境检测和依赖安装完成')

  // 自动跳转到下一步
  setTimeout(() => {
    handleNext()
  }, 1500)
}

const handleDepsError = (error) => {
  installStatus.value = 'error'
  installError.value = error
  addLog('error', `安装失败: ${error.message}`)
  ElMessage.error('依赖安装失败')
}

const startInstall = async () => {
  // 检查electronAPI是否可用
  if (!electron.isAvailable) {
    ElMessage.error('Electron API 未加载，请重启应用')
    return
  }

  loading.value = true
  installStatus.value = 'running'
  installError.value = null
  logs.value = []
  percentage.value = 0
  currentStep.value = 1
  stepName.value = '环境检测中'

  addLog('info', '开始环境检测...')

  try {
    // 先移除之前的监听器
    removeListeners.value.forEach(remove => remove())
    removeListeners.value = []

    // 注册事件监听，保存移除函数
    removeListeners.value.push(electron.onDepsProgress(handleDepsProgress))
    removeListeners.value.push(electron.onDepsLog(handleDepsLog))
    removeListeners.value.push(electron.onDepsSuccess(handleDepsSuccess))
    removeListeners.value.push(electron.onDepsError(handleDepsError))

    // 开始检测依赖
    await electron.checkDeps()
  } catch (error) {
    installStatus.value = 'error'
    installError.value = {
      message: error.message || '未知错误',
      detail: error.stack || ''
    }
    addLog('error', `安装失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const handleRetry = () => {
  startInstall()
}

const handleNext = () => {
  router.push('/install')
}

const handleCancel = () => {
  ElMessageBox.confirm(
    '确定要取消安装吗？已安装的依赖将会保留。',
    '确认取消',
    {
      confirmButtonText: '确定',
      cancelButtonText: '继续安装',
      type: 'warning'
    }
  ).then(() => {
    router.push('/')
  }).catch(() => {
    // 取消操作
  })
}

onMounted(() => {
  startInstall()
})

onBeforeUnmount(() => {
  // 移除所有事件监听
  removeListeners.value.forEach(remove => remove())
  removeListeners.value = []
})
</script>

<style scoped>
.deps-install-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.install-container {
  max-width: 800px;
  width: 100%;
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.install-header {
  text-align: center;
  margin-bottom: 30px;
}

.install-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 8px;
}

.install-header p {
  color: #606266;
  font-size: 14px;
}

.error-tip {
  margin-bottom: 20px;
}

.install-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}
</style>
