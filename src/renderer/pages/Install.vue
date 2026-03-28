<template>
  <Layout>
    <div class="install-page">
      <div class="install-container">
        <div class="install-header">
          <h2>openclaw 安装</h2>
          <p>正在安装和配置 openclaw 服务，请耐心等待...</p>
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
          title="安装失败"
          :description="installError.message"
          :detail="installError.detail"
          class="error-tip"
        />

        <!-- 成功提示 -->
        <div v-if="installStatus === 'success'" class="success-tip">
          <el-alert
            title="安装成功"
            type="success"
            show-icon
            :closable="false"
          >
            <template #default>
              <p>openclaw 服务已成功安装！</p>
              <p>您现在可以在主页面进行配置或启动服务。</p>
            </template>
          </el-alert>
        </div>

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
            完成
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

const router = useRouter()
const appStore = useAppStore()

const loading = ref(false)
const installStatus = ref<'idle' | 'running' | 'success' | 'error'>('idle')
const installError = ref<{ message: string; detail: string } | null>(null)
const accessUrl = ref('')

// 进度相关
const currentStep = ref(1)
const totalSteps = ref(5)
const stepName = ref('下载安装包中')
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
const handleInstallProgress = (data) => {
  currentStep.value = data.currentStep || 1
  stepName.value = data.stepName || '处理中...'
  percentage.value = data.percentage || 0
}

const handleInstallLog = (data) => {
  addLog(data.type, data.content)
}

const handleInstallSuccess = (data) => {
  installStatus.value = 'success'
  percentage.value = 100
  accessUrl.value = data.accessUrl
  addLog('info', `openclaw 安装完成，访问地址: ${data.accessUrl}`)
  ElMessage.success('openclaw 安装成功')
}

const handleInstallError = (error) => {
  installStatus.value = 'error'
  installError.value = error
  addLog('error', `安装失败: ${error.message}`)
  ElMessage.error('openclaw 安装失败')
}

const startInstall = async () => {
  loading.value = true
  installStatus.value = 'running'
  installError.value = null
  accessUrl.value = ''
  logs.value = []
  percentage.value = 0
  currentStep.value = 1
  stepName.value = '安装 openclaw 中'

  addLog('info', '开始安装 openclaw...')

  try {
    // 先移除之前的监听器
    removeListeners.value.forEach(remove => remove())
    removeListeners.value = []

    // 注册事件监听，保存移除函数
    removeListeners.value.push(window.electronAPI.onInstallProgress(handleInstallProgress))
    removeListeners.value.push(window.electronAPI.onInstallLog(handleInstallLog))
    removeListeners.value.push(window.electronAPI.onInstallSuccess(handleInstallSuccess))
    removeListeners.value.push(window.electronAPI.onInstallError(handleInstallError))

    // 简化安装逻辑，只安装 openclaw，不传递配置
    addLog('info', '正在安装 openclaw 服务...')
    await window.electronAPI.installOpenclaw()
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
  router.push('/')
}

const handleCancel = () => {
  ElMessageBox.confirm(
    '确定要取消安装吗？已安装的文件将会保留。',
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
.install-page {
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

.success-tip {
  margin-bottom: 20px;
}

.access-url {
  margin-top: 8px;
  font-weight: 500;
}

.access-url a {
  color: #409eff;
  text-decoration: none;
}

.access-url a:hover {
  text-decoration: underline;
}

.install-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}
</style>
