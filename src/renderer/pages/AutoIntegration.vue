<template>
  <Layout>
    <div class="auto-integration-page">
      <div class="header-section">
        <el-button @click="goBack" icon="ArrowLeft" type="text" :disabled="status === 'running'">
          返回
        </el-button>
        <h2>自动集成企业微信</h2>
        <p class="subtitle">系统将自动完成企业微信应用的创建和配置</p>
      </div>

      <div class="content-section">
        <!-- 步骤说明 -->
        <div class="steps-container" v-if="status === 'idle' || status === 'running'">
          <el-steps :active="currentStep - 1" finish-status="success" align-center>
            <el-step title="准备环境" description="检查系统环境和依赖" />
            <el-step title="创建应用" description="自动创建企业微信应用" />
            <el-step title="配置权限" description="配置应用接口权限" />
            <el-step title="验证配置" description="验证集成配置有效性" />
          </el-steps>
        </div>

        <!-- 进度条 -->
        <ProgressBar
          v-if="status === 'running'"
          :current-step="currentStep"
          :total-steps="4"
          :step-name="stepName"
          :percentage="percentage"
        />

        <!-- 错误提示 -->
        <ErrorTip
          v-if="status === 'error'"
          title="集成失败"
          :description="errorMessage"
          :detail="errorDetail"
        />

        <!-- 成功提示 - 需要输入匹配码 -->
        <div class="success-section" v-if="status === 'success' && !matched">
          <el-alert
            title="集成已完成"
            type="success"
            description="请输入企业微信管理后台收到的匹配码以完成配置"
            show-icon
            style="margin-bottom: 24px;"
          />
          <el-form :model="form" label-width="100px" style="max-width: 500px; margin: 0 auto;">
            <el-form-item label="匹配码" prop="matchCode" :rules="[{ required: true, message: '请输入匹配码', trigger: 'blur' }]">
              <el-input
                v-model="form.matchCode"
                placeholder="请输入6位匹配码"
                maxlength="6"
                show-word-limit
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitMatchCode" :loading="submitting">
                提交
              </el-button>
              <el-button @click="resetIntegration">重新集成</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 匹配成功 -->
        <div class="complete-section" v-if="matched">
          <el-result
            icon="success"
            title="集成成功"
            sub-title="企业微信集成已完成，您可以开始使用相关功能了"
          >
            <template #extra>
              <el-button type="primary" @click="goToHome">
                返回首页
              </el-button>
            </template>
          </el-result>
        </div>

        <!-- 日志查看器 -->
        <LogViewer
          v-if="status === 'running' || status === 'error'"
          :logs="logs"
          @clear="clearLogs"
        />

        <!-- 操作按钮 -->
        <div class="action-buttons" v-if="status === 'idle' || status === 'error'">
          <el-button type="primary" size="large" @click="startIntegration" :loading="loading">
            {{ status === 'idle' ? '开始自动集成' : '重试' }}
          </el-button>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../store'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage, ElForm } from 'element-plus'
import Layout from '../components/Layout.vue'
import ProgressBar from '../components/ProgressBar.vue'
import LogViewer from '../components/LogViewer.vue'
import ErrorTip from '../components/ErrorTip.vue'

const router = useRouter()
const appStore = useAppStore()
const formRef = ref(null)

const status = ref('idle') // idle | running | success | error
const loading = ref(false)
const submitting = ref(false)
const currentStep = ref(1)
const stepName = ref('准备环境')
const percentage = ref(0)
const errorMessage = ref('')
const errorDetail = ref('')
const matched = ref(false)
const logs = ref([])

const form = ref({
  matchCode: ''
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

const resetIntegration = () => {
  status.value = 'idle'
  currentStep.value = 1
  stepName.value = '准备环境'
  percentage.value = 0
  errorMessage.value = ''
  errorDetail.value = ''
  matched.value = false
  form.value.matchCode = ''
  clearLogs()
}

const startIntegration = () => {
  loading.value = true
  status.value = 'running'
  resetIntegration()

  // 开始自动集成
  window.electronAPI.startAutoIntegration()
}

const submitMatchCode = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true

    // 提交匹配码到主进程（业务逻辑后续实现）
    // const result = await window.electronAPI.submitMatchCode(form.value.matchCode)
    // if (result.success) {
    //   matched.value = true
    //   ElMessage.success('匹配码验证成功')
    // } else {
    //   ElMessage.error(result.message || '匹配码验证失败')
    // }

    // 临时逻辑
    submitting.value = false
    matched.value = true
    ElMessage.success('匹配码验证成功')
  } catch (error) {
    ElMessage.error('请输入正确的匹配码')
  }
}

// 监听集成步骤
const handleIntegrationStep = (data) => {
  currentStep.value = data.step
  stepName.value = data.stepName
  percentage.value = data.percentage

  logs.value.push({
    type: 'info',
    content: data.message,
    timestamp: new Date()
  })
}

// 监听集成成功
const handleIntegrationSuccess = () => {
  status.value = 'success'
  loading.value = false

  logs.value.push({
    type: 'info',
    content: '自动集成完成，请输入匹配码',
    timestamp: new Date()
  })

  ElMessage.success('集成步骤已完成，请输入匹配码')
}

// 监听集成错误
const handleIntegrationError = (error) => {
  status.value = 'error'
  loading.value = false
  errorMessage.value = error.message || '集成过程中发生错误'
  errorDetail.value = error.detail || JSON.stringify(error, null, 2)

  logs.value.push({
    type: 'error',
    content: `集成失败: ${error.message}`,
    timestamp: new Date()
  })

  ElMessage.error('集成失败，请查看错误详情')
}

// 保存移除监听器的函数
let removeStepListener, removeSuccessListener, removeErrorListener

onMounted(() => {
  // 注册事件监听，保存移除函数
  removeStepListener = window.electronAPI.onIntegrationStep(handleIntegrationStep)
  removeSuccessListener = window.electronAPI.onIntegrationSuccess(handleIntegrationSuccess)
  removeErrorListener = window.electronAPI.onIntegrationError(handleIntegrationError)
})

onUnmounted(() => {
  // 移除事件监听
  if (removeStepListener) removeStepListener()
  if (removeSuccessListener) removeSuccessListener()
  if (removeErrorListener) removeErrorListener()
})
</script>

<style scoped>
.auto-integration-page {
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

.steps-container {
  margin-bottom: 40px;
}

.success-section {
  margin-bottom: 30px;
}

.complete-section {
  margin: 40px 0;
}

.action-buttons {
  text-align: center;
  margin-top: 30px;
}
</style>
