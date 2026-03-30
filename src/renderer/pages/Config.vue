<template>
  <Layout>
    <div class="config-page">
      <div class="form-container">
        <div class="form-header">
          <h2>OpenClaw 配置管理</h2>
          <p>请填写以下配置信息，用于配置已安装的 openclaw 服务</p>
        </div>

        <el-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          label-width="140px"
          class="config-form"
        >
          <el-form-item label="大模型供应商" prop="llmProvider">
            <el-select v-model="formData.llmProvider" placeholder="请选择大模型供应商" style="width: 100%;" @change="handleProviderChange">
              <el-option label="OpenAI" value="openai" />
              <el-option label="火山引擎" value="volcengine" />
            </el-select>
          </el-form-item>


          <!-- OpenAI 配置 -->
          <template v-if="formData.llmProvider === 'openai'">
            <el-divider content-position="left">OpenAI 配置</el-divider>

            <el-form-item label="API Key" prop="apiKey">
              <el-input
                v-model="formData.openai.apiKey"
                type="password"
                placeholder="请输入 OpenAI API Key，例如：sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                show-password
              />
            </el-form-item>

            <el-form-item label="API端点" prop="endpoint">
              <el-input
                v-model="formData.openai.endpoint"
                placeholder="请输入 OpenAI API 端点，例如：https://api.openai.com/v1"
              />
              <div class="form-tip">默认使用 OpenAI 官方地址</div>
            </el-form-item>

            <el-form-item label="模型名称" prop="model">
              <el-input
                v-model="formData.openai.model"
                placeholder="请输入模型名称，例如：gpt-4, gpt-3.5-turbo"
              />
              <div class="form-tip">常用模型：gpt-4, gpt-3.5-turbo</div>
            </el-form-item>
          </template>

          <!-- 火山引擎配置 -->
          <template v-if="formData.llmProvider === 'volcengine'">
            <el-divider content-position="left">火山引擎配置</el-divider>

            <el-form-item label="API Key" prop="apiKey">
              <el-input
                v-model="formData.volcengine.apiKey"
                type="password"
                placeholder="请输入火山引擎 API Key，例如：70a18a29-3f79-4241-96c1-b55eeb0ba115"
                show-password
              />
            </el-form-item>

            <el-form-item label="API端点" prop="endpoint">
              <el-input
                v-model="formData.volcengine.endpoint"
                placeholder="请输入火山引擎 API 端点，例如：https://ark.cn-beijing.volces.com/api/coding/v3"
              />
              <div class="form-tip">默认使用火山引擎公共端点</div>
            </el-form-item>

            <el-form-item label="选择模型" prop="model">
              <el-select v-model="formData.volcengine.model" placeholder="请选择模型" style="width: 100%;">
                <el-option label="ark-code-latest" value="ark-code-latest" />
                <el-option label="doubao-seed-code" value="doubao-seed-code" />
                <el-option label="glm-4.7" value="glm-4.7" />
                <el-option label="deepseek-v3.2" value="deepseek-v3.2" />
                <el-option label="doubao-seed-2.0-code" value="doubao-seed-2.0-code" />
                <el-option label="doubao-seed-2.0-pro" value="doubao-seed-2.0-pro" />
                <el-option label="doubao-seed-2.0-lite" value="doubao-seed-2.0-lite" />
                <el-option label="minimax-m2.5" value="minimax-m2.5" />
                <el-option label="kimi-k2.5" value="kimi-k2.5" />
              </el-select>
            </el-form-item>
          </template>

          <el-form-item class="form-actions">
            <el-button type="primary" size="large" @click="handleSubmit" :loading="loading">
              保存配置
            </el-button>
            <el-button size="large" @click="handleCancel">
              取消
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElForm } from 'element-plus'
import { useAppStore } from '../store'
import Layout from '../components/Layout.vue'

const router = useRouter()
const appStore = useAppStore()
const formRef = ref(null)
const loading = ref(false)

const formData = reactive({
  llmProvider: 'openai',
  openai: {
    apiKey: '',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4'
  },
  volcengine: {
    apiKey: '',
    endpoint: 'https://ark.cn-beijing.volces.com/api/coding/v3',
    model: 'doubao-seed-2.0-pro'
  }
})

const rules = {
  llmProvider: [
    { required: true, message: '请选择大模型供应商', trigger: 'change' }
  ]
}

const handleSubmit = async () => {
  if (!formRef.value) return

  formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true

      try {
        // 保存配置到Pinia
        appStore.updateInstallConfig(formData)

        // 构建要传递给主进程的配置
        const configToSave = {
          llmProvider: formData.llmProvider,
          // 根据选择的供应商传递对应的配置
          ...(formData.llmProvider === 'openai' ? formData.openai : {}),
          ...(formData.llmProvider === 'volcengine' ? formData.volcengine : {})
        }

        // 调用主进程保存配置文件
        if (window.electronAPI) {
          const result = await window.electronAPI.saveOpenclawConfig(configToSave)
          if (!result.success) {
            ElMessage.warning('配置保存到文件失败: ' + result.error)
          }
        }

        ElMessage.success('配置信息已保存')

        setTimeout(() => {
          loading.value = false
          router.push('/')
        }, 500)
      } catch (error) {
        ElMessage.error('保存配置失败: ' + error.message)
        loading.value = false
      }
    } else {
      ElMessage.error('请填写完整的配置信息')
      return false
    }
  })
}

// 供应商切换事件处理
const handleProviderChange = (provider) => {
  console.log('切换模型供应商:', provider)
}

const handleCancel = () => {
  router.push('/')
}
</script>

<style scoped>
.config-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.form-container {
  max-width: 600px;
  width: 100%;
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.form-header {
  text-align: center;
  margin-bottom: 30px;
}

.form-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 8px;
}

.form-header p {
  color: #606266;
  font-size: 14px;
}

.config-form {
  margin-top: 30px;
}

.form-actions {
  text-align: center;
  margin-top: 40px;
  margin-bottom: 0;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>