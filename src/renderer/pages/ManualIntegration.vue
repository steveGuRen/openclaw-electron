<template>
  <Layout>
    <div class="manual-integration-page">
      <div class="header-section">
        <el-button @click="goBack" icon="ArrowLeft" type="text">
          返回
        </el-button>
        <h2>手动集成企业微信</h2>
        <p class="subtitle">按照步骤手动配置企业微信应用参数</p>
      </div>

      <div class="content-section">
        <!-- 步骤导航 -->
        <el-steps :active="currentStep - 1" finish-status="success" align-center style="margin-bottom: 40px;">
          <el-step title="步骤1" description="创建应用" />
          <el-step title="步骤2" description="配置参数" />
          <el-step title="步骤3" description="完成集成" />
        </el-steps>

        <!-- 步骤1：操作指引 -->
        <div v-if="currentStep === 1" class="step-content">
          <div class="guide-card">
            <h3>第一步：创建企业微信应用</h3>
            <div class="guide-content">
              <ol>
                <li>登录企业微信管理后台 (https://work.weixin.qq.com/)</li>
                <li>进入"应用管理" → "自建" → "创建应用"</li>
                <li>上传应用logo，填写应用名称和介绍</li>
                <li>选择可见范围，建议设置为全部成员</li>
                <li>创建完成后，记录下 AgentId 和 Secret</li>
                <li>进入"我的企业"，记录下 CorpID</li>
                <li>在应用详情页，设置接收消息服务器配置：
                  <ul>
                    <li>URL: 填写您的服务器地址</li>
                    <li>Token: 自定义生成Token并记录</li>
                    <li>EncodingAESKey: 随机生成并记录</li>
                  </ul>
                </li>
              </ol>
            </div>
            <div class="step-actions">
              <el-button type="primary" @click="currentStep = 2">
                下一步，填写配置
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <!-- 步骤2：表单填写 -->
        <div v-if="currentStep === 2" class="step-content">
          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="140px"
            class="config-form"
          >
            <el-card title="企业微信基础配置">
              <el-form-item label="企业ID (CorpID)" prop="corpId">
                <el-input
                  v-model="form.corpId"
                  placeholder="请输入企业微信CorpID"
                />
              </el-form-item>

              <el-form-item label="应用ID (AgentId)" prop="agentId">
                <el-input
                  v-model="form.agentId"
                  placeholder="请输入应用AgentId"
                />
              </el-form-item>

              <el-form-item label="应用密钥 (Secret)" prop="secret">
                <el-input
                  v-model="form.secret"
                  type="password"
                  placeholder="请输入应用Secret"
                  show-password
                />
              </el-form-item>

              <el-form-item label="令牌 (Token)" prop="token">
                <el-input
                  v-model="form.token"
                  placeholder="请输入自定义Token"
                />
              </el-form-item>

              <el-form-item label="消息加密密钥 (EncodingAESKey)" prop="encodingAesKey">
                <el-input
                  v-model="form.encodingAesKey"
                  placeholder="请输入EncodingAESKey"
                  show-word-limit
                  maxlength="43"
                />
              </el-form-item>
            </el-card>

            <div class="step-actions">
              <el-button @click="currentStep = 1">
                <el-icon><ArrowLeft /></el-icon>
                上一步
              </el-button>
              <el-button type="primary" @click="submitForm" :loading="loading">
                提交配置
              </el-button>
            </div>
          </el-form>
        </div>

        <!-- 步骤3：完成集成 -->
        <div v-if="currentStep === 3" class="step-content">
          <el-result
            :icon="status === 'success' ? 'success' : 'error'"
            :title="status === 'success' ? '集成成功' : '集成失败'"
            :sub-title="status === 'success'
              ? '企业微信手动集成已完成，您可以开始使用相关功能了'
              : '配置验证失败，请检查参数是否正确并重试'"
          >
            <template #extra v-if="status === 'success'">
              <el-button type="primary" @click="goToHome">
                返回首页
              </el-button>
            </template>
            <template #extra v-if="status === 'error'">
              <el-button type="primary" @click="currentStep = 2">
                返回修改
              </el-button>
              <el-button @click="goToHome">
                取消
              </el-button>
            </template>
          </el-result>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage, ElForm } from 'element-plus'
import Layout from '../components/Layout.vue'

const router = useRouter()
const formRef = ref(null)

const currentStep = ref(1)
const loading = ref(false)
const status = ref('idle') // idle | success | error

const form = reactive({
  corpId: '',
  agentId: '',
  secret: '',
  token: '',
  encodingAesKey: ''
})

const rules = {
  corpId: [
    { required: true, message: '请输入企业ID', trigger: 'blur' },
    { min: 18, max: 18, message: '企业ID长度为18位', trigger: 'blur' }
  ],
  agentId: [
    { required: true, message: '请输入应用ID', trigger: 'blur' },
    { pattern: /^\d+$/, message: '应用ID必须为数字', trigger: 'blur' }
  ],
  secret: [
    { required: true, message: '请输入应用密钥', trigger: 'blur' },
    { min: 43, max: 43, message: '应用密钥长度为43位', trigger: 'blur' }
  ],
  token: [
    { required: true, message: '请输入Token', trigger: 'blur' },
    { min: 3, max: 32, message: 'Token长度为3-32位', trigger: 'blur' }
  ],
  encodingAesKey: [
    { required: true, message: '请输入消息加密密钥', trigger: 'blur' },
    { min: 43, max: 43, message: 'EncodingAESKey长度为43位', trigger: 'blur' }
  ]
}

const goBack = () => {
  router.back()
}

const goToHome = () => {
  router.push('/')
}

// 保存移除监听器的函数
let removeSuccessListener, removeErrorListener

const submitForm = async () => {
  try {
    await formRef.value.validate()
    loading.value = true
    status.value = 'idle'

    // 先移除之前的监听器
    if (removeSuccessListener) removeSuccessListener()
    if (removeErrorListener) removeErrorListener()

    // 监听集成结果，保存移除函数
    const handleSuccess = () => {
      loading.value = false
      status.value = 'success'
      currentStep.value = 3
      ElMessage.success('配置提交成功，集成完成')
    }

    const handleError = (error) => {
      loading.value = false
      status.value = 'error'
      currentStep.value = 3
      ElMessage.error(`配置验证失败: ${error.message || '请检查参数是否正确'}`)
    }

    removeSuccessListener = window.electronAPI.onIntegrationSuccess(handleSuccess)
    removeErrorListener = window.electronAPI.onIntegrationError(handleError)

    // 提交手动集成配置
    await window.electronAPI.submitManualIntegration(form)

  } catch (error) {
    ElMessage.error('请检查表单填写是否正确')
  }
}

onUnmounted(() => {
  // 组件卸载时移除所有监听器
  if (removeSuccessListener) removeSuccessListener()
  if (removeErrorListener) removeErrorListener()
})
</script>

<style scoped>
.manual-integration-page {
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

.step-content {
  min-height: 400px;
}

.guide-card {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.guide-card h3 {
  font-size: 20px;
  color: #303133;
  margin-bottom: 20px;
}

.guide-content ol {
  line-height: 2.2;
  color: #606266;
  padding-left: 20px;
}

.guide-content ul {
  margin: 8px 0 8px 20px;
  line-height: 2;
}

.config-form {
  background: white;
  border-radius: 8px;
}

.config-form .el-card {
  margin-bottom: 20px;
}

.step-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
}
</style>
