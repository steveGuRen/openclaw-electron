<template>
  <Layout>
    <div class="uninstall-page">
      <div class="header-section">
        <el-button @click="goBack" icon="ArrowLeft" type="text" :disabled="status === 'uninstalling'">
          返回
        </el-button>
        <h2>卸载 OpenClaw</h2>
        <p class="subtitle">移除 OpenClaw 及相关配置</p>
      </div>

      <div class="content-section">
        <!-- 确认卸载 -->
        <div v-if="status === 'confirm'" class="confirm-section">
          <el-alert
            title="风险提示"
            type="warning"
            description="卸载操作将删除 OpenClaw 所有相关文件、配置和数据，请谨慎操作。此操作不可撤销！"
            show-icon
            style="margin-bottom: 30px;"
          />

          <el-card class="warning-card">
            <div class="warning-content">
              <el-icon size="48" color="#f56c6c"><Warning /></el-icon>
              <div class="warning-text">
                <h3>确认要卸载 OpenClaw 吗？</h3>
                <p>卸载后将无法使用企业微信集成等相关功能，所有配置信息将被清除。</p>
              </div>
            </div>

            <div class="confirm-form">
              <el-form :model="form" label-width="100px">
                <el-form-item label="确认卸载">
                  <el-checkbox v-model="form.confirmDelete" label="我已了解风险，确认要卸载">
                  </el-checkbox>
                </el-form-item>
                <el-form-item label="保留数据">
                  <el-checkbox v-model="form.keepData" label="保留配置和日志数据">
                  </el-checkbox>
                </el-form-item>
              </el-form>
            </div>
          </el-card>

          <div class="action-buttons">
            <el-button type="danger" size="large" @click="startUninstall" :disabled="!form.confirmDelete" :loading="loading">
              确认卸载
            </el-button>
            <el-button size="large" @click="goBack">
              取消
            </el-button>
          </div>
        </div>

        <!-- 卸载进度 -->
        <div v-if="status === 'uninstalling'" class="uninstalling-section">
          <ProgressBar
            :current-step="currentStep"
            :total-steps="4"
            :step-name="stepName"
            :percentage="percentage"
          />

          <LogViewer :logs="logs" @clear="clearLogs" />

          <div class="action-buttons">
            <el-button type="primary" disabled :loading="true">
              卸载中，请稍候...
            </el-button>
          </div>
        </div>

        <!-- 卸载结果 -->
        <div v-if="status === 'success' || status === 'error'" class="result-section">
          <el-result
            :icon="status === 'success' ? 'success' : 'error'"
            :title="status === 'success' ? '卸载成功' : '卸载失败'"
            :sub-title="status === 'success'
              ? 'OpenClaw 已成功从您的系统中移除'
              : '卸载过程中发生错误，请重试或手动删除相关文件'"
          >
            <template #extra>
              <el-button type="primary" @click="status === 'success' ? goToHome() : reset()">
                {{ status === 'success' ? '完成' : '重试' }}
              </el-button>
              <el-button @click="goBack">
                返回
              </el-button>
            </template>
          </el-result>

          <ErrorTip
            v-if="status === 'error'"
            title="卸载失败"
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
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Warning } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import Layout from '../components/Layout.vue'
import ProgressBar from '../components/ProgressBar.vue'
import LogViewer from '../components/LogViewer.vue'
import ErrorTip from '../components/ErrorTip.vue'

const router = useRouter()

const status = ref('confirm') // confirm | uninstalling | success | error
const loading = ref(false)
const currentStep = ref(1)
const stepName = ref('准备卸载')
const percentage = ref(0)
const errorMessage = ref('')
const errorDetail = ref('')
const logs = ref([])

const form = reactive({
  confirmDelete: false,
  keepData: true
})

const goBack = () => {
  router.back()
}

const goToHome = () => {
  router.push('/')
}

const clearLogs = () => {
  logs.value = []
}

const reset = () => {
  status.value = 'confirm'
  currentStep.value = 1
  stepName.value = '准备卸载'
  percentage.value = 0
  errorMessage.value = ''
  errorDetail.value = ''
  form.confirmDelete = false
  clearLogs()
}

const startUninstall = async () => {
  try {
    await ElMessageBox.confirm(
      '此操作将永久删除 OpenClaw 相关文件，是否继续？',
      '确认卸载',
      {
        confirmButtonText: '继续',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true
    status.value = 'uninstalling'
    clearLogs()

    logs.value.push({
      type: 'info',
      content: '开始卸载 OpenClaw...',
      timestamp: new Date()
    })

    // 调用卸载API
    window.electronAPI.uninstallOpenclaw()
  } catch (error) {
    // 用户取消
  }
}

// 保存移除监听器的函数
let removeProgressListener, removeLogListener, removeSuccessListener, removeErrorListener

// 监听卸载进度
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

// 监听卸载日志
const handleLog = (data) => {
  logs.value.push({
    type: data.type || 'info',
    content: data.message,
    timestamp: new Date()
  })
}

// 监听卸载成功
const handleSuccess = () => {
  status.value = 'success'
  loading.value = false

  logs.value.push({
    type: 'info',
    content: '卸载完成',
    timestamp: new Date()
  })

  ElMessage.success('卸载成功')
}

// 监听卸载错误
const handleError = (error) => {
  status.value = 'error'
  loading.value = false
  errorMessage.value = error.message || '卸载过程中发生错误'
  errorDetail.value = error.detail || JSON.stringify(error, null, 2)

  logs.value.push({
    type: 'error',
    content: `卸载失败: ${error.message}`,
    timestamp: new Date()
  })

  ElMessage.error('卸载失败')
}

onMounted(() => {
  // 注册事件监听，使用专门的卸载事件
  removeProgressListener = window.electronAPI.onUninstallProgress(handleProgress)
  removeLogListener = window.electronAPI.onUninstallLog(handleLog)
  removeSuccessListener = window.electronAPI.onUninstallSuccess(handleSuccess)
  removeErrorListener = window.electronAPI.onUninstallError(handleError)
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
.uninstall-page {
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

.confirm-section {
  margin-bottom: 30px;
}

.warning-card {
  background: white;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 30px;
}

.warning-content {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #fde2e2;
}

.warning-text h3 {
  font-size: 20px;
  color: #303133;
  margin-bottom: 12px;
}

.warning-text p {
  color: #606266;
  line-height: 1.6;
  margin: 0;
}

.confirm-form {
  max-width: 500px;
  margin: 0 auto;
}

.uninstalling-section {
  margin-bottom: 30px;
}

.result-section {
  margin: 40px 0;
}

.action-buttons {
  text-align: center;
  margin-top: 30px;
  display: flex;
  justify-content: center;
  gap: 20px;
}
</style>
