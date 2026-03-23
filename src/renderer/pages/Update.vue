<template>
  <Layout>
    <div class="update-page">
      <div class="header-section">
        <el-button @click="goBack" icon="ArrowLeft" type="text" :disabled="status === 'updating'">
          返回
        </el-button>
        <h2>更新 OpenClaw</h2>
        <p class="subtitle">检测并更新到最新版本</p>
      </div>

      <div class="content-section">
        <!-- 检测状态 -->
        <div v-if="status === 'checking'" class="checking-section">
          <el-empty description="正在检测安装状态..." :image-size="80">
            <template #image>
              <el-icon class="is-loading" size="80"><Loading /></el-icon>
            </template>
          </el-empty>
        </div>

        <!-- 未安装提示 -->
        <div v-if="status === 'not_installed'" class="not-installed-section">
          <el-alert
            title="OpenClaw 未安装"
            type="warning"
            description="检测到您尚未安装OpenClaw，请先完成安装流程。"
            show-icon
          />
          <div class="action-buttons">
            <el-button type="primary" @click="goToInstall">
              前往安装
            </el-button>
          </div>
        </div>

        <!-- 版本信息 -->
        <div v-if="status === 'idle'" class="version-section">
          <el-card class="version-card">
            <div class="version-info">
            <div class="version-item">
              <span class="label">当前版本：</span>
              <span class="value">{{ currentVersion }}</span>
            </div>
            <div class="version-item">
              <span class="label">最新版本：</span>
              <span class="value latest">{{ latestVersion }}</span>
            </div>
            <div class="version-item" v-if="hasUpdate">
              <el-tag type="success" size="large">有新版本可用</el-tag>
            </div>
            <div class="version-item" v-else>
              <el-tag type="info" size="large">已是最新版本</el-tag>
            </div>
          </div>
          <div class="update-tip" v-if="hasUpdate">
            <h4>更新内容：</h4>
            <ul>
              <li>优化企业微信集成稳定性</li>
              <li>修复已知问题，提升系统性能</li>
              <li>新增更多自动化功能</li>
              <li>优化用户操作体验</li>
            </ul>
          </div>
          </el-card>

          <div class="action-buttons">
            <el-button
              type="primary"
              size="large"
              @click="startUpdate"
              :loading="loading"
              :disabled="!hasUpdate"
            >
              {{ hasUpdate ? '立即更新' : '检查更新' }}
            </el-button>
          </div>
        </div>

        <!-- 更新进度 -->
        <div v-if="status === 'updating'" class="updating-section">
          <ProgressBar
            :current-step="currentStep"
            :total-steps="3"
            :step-name="stepName"
            :percentage="percentage"
          />

          <LogViewer :logs="logs" @clear="clearLogs" />

          <div class="action-buttons">
            <el-button type="primary" disabled :loading="true">
              更新中，请稍候...
            </el-button>
          </div>
        </div>

        <!-- 更新结果 -->
        <div v-if="status === 'success' || status === 'error'" class="result-section">
          <el-result
            :icon="status === 'success' ? 'success' : 'error'"
            :title="status === 'success' ? '更新成功' : '更新失败'"
            :sub-title="status === 'success'
              ? 'OpenClaw 已成功更新到最新版本'
              : '更新过程中发生错误，请重试或联系技术支持'"
          >
            <template #extra>
              <el-button type="primary" @click="reset">
                {{ status === 'success' ? '完成' : '重试' }}
              </el-button>
              <el-button @click="goBack">
                返回
              </el-button>
            </template>
          </el-result>

          <ErrorTip
            v-if="status === 'error'"
            title="更新失败"
            :description="errorMessage"
            :detail="errorDetail"
            style="margin-top: 20px;"
          />
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import Layout from '../components/Layout.vue'
import ProgressBar from '../components/ProgressBar.vue'
import LogViewer from '../components/LogViewer.vue'
import ErrorTip from '../components/ErrorTip.vue'

const router = useRouter()

const status = ref('checking') // checking | not_installed | idle | updating | success | error
const loading = ref(false)
const currentVersion = ref('v1.0.0')
const latestVersion = ref('v1.1.0')
const hasUpdate = ref(true)
const currentStep = ref(1)
const stepName = ref('准备更新')
const percentage = ref(0)
const errorMessage = ref('')
const errorDetail = ref('')
const logs = ref([])

const goBack = () => {
  router.back()
}

const goToInstall = () => {
  router.push('/install')
}

const clearLogs = () => {
  logs.value = []
}

const reset = () => {
  status.value = 'checking'
  currentStep.value = 1
  stepName.value = '准备更新'
  percentage.value = 0
  errorMessage.value = ''
  errorDetail.value = ''
  clearLogs()
  checkInstallation()
}

const checkInstallation = async () => {
  try {
    // 获取版本信息
    const versionInfo = await window.electronAPI.invoke('get-app-version')
    currentVersion.value = versionInfo.currentVersion
    latestVersion.value = versionInfo.latestVersion
    hasUpdate.value = versionInfo.hasUpdate

    // 检测安装状态
    const isInstalled = await window.electronAPI.invoke('check-installation')
    if (!isInstalled) {
      status.value = 'not_installed'
    } else {
      status.value = 'idle'
    }
  } catch (error) {
    // 获取版本信息失败时使用默认值
    status.value = 'idle'
  }
}

const startUpdate = () => {
  loading.value = true
  status.value = 'updating'
  clearLogs()

  logs.value.push({
    type: 'info',
    content: '开始更新 OpenClaw...',
    timestamp: new Date()
  })

  // 调用更新API
  window.electronAPI.updateOpenclaw()
}

// 保存移除监听器的函数
let removeProgressListener, removeLogListener, removeSuccessListener, removeErrorListener

// 监听更新进度
const handleProgress = (data) => {
  currentStep.value = data.step
  stepName.value = data.stepName
  percentage.value = data.percentage

  logs.value.push({
    type: 'info',
    content: data.message,
    timestamp: new Date()
  })
}

// 监听更新日志
const handleLog = (data) => {
  logs.value.push({
    type: data.type || 'info',
    content: data.message,
    timestamp: new Date()
  })
}

// 监听更新成功
const handleSuccess = (data) => {
  status.value = 'success'
  loading.value = false
  currentVersion.value = latestVersion.value
  hasUpdate.value = false

  logs.value.push({
    type: 'info',
    content: '更新完成，当前版本：' + latestVersion.value,
    timestamp: new Date()
  })

  ElMessage.success('更新成功')
}

// 监听更新错误
const handleError = (error) => {
  status.value = 'error'
  loading.value = false
  errorMessage.value = error.message || '更新过程中发生错误'
  errorDetail.value = error.detail || JSON.stringify(error, null, 2)

  logs.value.push({
    type: 'error',
    content: `更新失败: ${error.message}`,
    timestamp: new Date()
  })

  ElMessage.error('更新失败')
}

onMounted(() => {
  checkInstallation()

  // 注册事件监听，使用专门的更新事件
  removeProgressListener = window.electronAPI.onUpdateProgress(handleProgress)
  removeLogListener = window.electronAPI.onUpdateLog(handleLog)
  removeSuccessListener = window.electronAPI.onUpdateSuccess(handleSuccess)
  removeErrorListener = window.electronAPI.onUpdateError(handleError)
})

onUnmounted(() => {
  // 移除事件监听
  if (removeProgressListener) removeProgressListener()
  if (removeLogListener) removeLogListener()
  if (removeSuccessListener) removeSuccessListener()
  if (removeErrorListener) removeErrorListener()
})
</script>

<style scoped>
.update-page {
  max-width: 1000px;
  margin: 0 auto;
}

.header-section {
  text-align: center;
  margin-bottom: 40px;
}

.header-section .el-button {
  position: absolute;
  left: 30px;
  top: 90px;
}

.header-section h2 {
  font-size: 28px;
  color: #303133;
  margin-bottom: 12px;
}

.subtitle {
  color: #909399;
  font-size: 14px;
  margin: 0;
}

.content-section {
  max-width: 800px;
  margin: 0 auto;
}

.checking-section {
  text-align: center;
  padding: 60px 0;
}

.not-installed-section {
  margin: 40px 0;
}

.version-section {
  margin-bottom: 30px;
}

.version-card {
  margin-bottom: 30px;
}

.version-info {
  padding: 20px 0;
}

.version-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  font-size: 16px;
}

.version-item .label {
  width: 100px;
  color: #606266;
}

.version-item .value {
  font-weight: 500;
  color: #303133;
}

.version-item .value.latest {
  color: #67c23a;
}

.update-tip {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.update-tip h4 {
  margin-bottom: 12px;
  color: #303133;
}

.update-tip ul {
  color: #606266;
  line-height: 1.8;
  padding-left: 20px;
  margin: 0;
}

.updating-section {
  margin-bottom: 30px;
}

.result-section {
  margin: 40px 0;
}

.action-buttons {
  text-align: center;
  margin-top: 30px;
}
</style>
