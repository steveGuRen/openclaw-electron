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
            <el-select v-model="formData.llmProvider" placeholder="请选择大模型供应商" style="width: 100%;">
              <el-option label="OpenAI" value="openai" />
            </el-select>
          </el-form-item>

          <el-form-item label="API Key" prop="apiKey">
            <el-input
              v-model="formData.apiKey"
              type="password"
              placeholder="请输入 OpenAI API Key，例如：sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              show-password
            />
          </el-form-item>

          <el-form-item label="机器人名称" prop="botName">
            <el-input
              v-model="formData.botName"
              placeholder="请输入机器人显示名称"
            />
          </el-form-item>

          <el-form-item label="机器人简介" prop="botDescription">
            <el-input
              v-model="formData.botDescription"
              type="textarea"
              :rows="3"
              placeholder="请输入机器人功能描述"
            />
          </el-form-item>

          <el-form-item label="用户名称" prop="userName">
            <el-input
              v-model="formData.userName"
              placeholder="请输入您的姓名或昵称"
            />
          </el-form-item>

          <el-form-item label="API端点" prop="endpoint">
            <el-input
              v-model="formData.endpoint"
              placeholder="请输入 OpenAI API 端点，例如：https://api.openai.com/v1"
            />
            <div class="form-tip">默认使用 OpenAI 官方地址</div>
          </el-form-item>

          <el-form-item label="模型名称" prop="model">
            <el-input
              v-model="formData.model"
              placeholder="请输入模型名称，例如：gpt-4, gpt-3.5-turbo"
            />
            <div class="form-tip">常用模型：gpt-4, gpt-3.5-turbo</div>
          </el-form-item>

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
  apiKey: '',
  botName: 'AI 助手',
  botDescription: '一个智能的 AI 助手，可以帮助您完成各种任务',
  userName: '',
  endpoint: 'https://api.openai.com/v1',
  model: 'gpt-4'
})

const rules = {
  llmProvider: [
    { required: true, message: '请选择大模型供应商', trigger: 'change' }
  ],
  apiKey: [
    { required: true, message: '请输入API Key', trigger: 'blur' },
    { min: 10, message: 'API Key 长度不能少于10位', trigger: 'blur' }
  ],
  botName: [
    { required: true, message: '请输入机器人名称', trigger: 'blur' },
    { min: 2, max: 20, message: '机器人名称长度在2到20个字符之间', trigger: 'blur' }
  ],
  botDescription: [
    { required: true, message: '请输入机器人简介', trigger: 'blur' },
    { min: 10, max: 200, message: '简介长度在10到200个字符之间', trigger: 'blur' }
  ],
  userName: [
    { required: true, message: '请输入用户名称', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名称长度在2到20个字符之间', trigger: 'blur' }
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

        // 调用主进程保存配置文件
        if (window.electronAPI) {
          const result = await window.electronAPI.saveOpenclawConfig({ ...formData })
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