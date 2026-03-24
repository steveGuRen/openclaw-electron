<template>
  <Layout>
    <div class="info-collect-page">
      <div class="form-container">
        <div class="form-header">
          <h2>基础配置信息</h2>
          <p>请填写以下配置信息，用于初始化 openclaw 服务</p>
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
              <el-option label="DeepSeek" value="deepseek" />
              <el-option label="Anthropic Claude" value="anthropic" />
              <el-option label="z.ai" value="z.ai" />
              <el-option label="z.ai Coding Plan" value="z.ai-coding" />
              <el-option label="Kimi" value="kimi" />
              <el-option label="MiniMax" value="minimax" />
              <el-option label="通义千问" value="qwen" />
            </el-select>
          </el-form-item>

          <el-form-item label="API Key" prop="apiKey">
            <el-input
              v-model="formData.apiKey"
              type="password"
              placeholder="请输入大模型 API Key"
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

          <el-form-item label="安装路径" prop="installPath">
            <el-input
              v-model="formData.installPath"
              placeholder="请输入openclaw安装路径，默认使用C:\\openclaw"
            />
            <div class="form-tip">留空则使用默认安装路径</div>
          </el-form-item>

          <el-form-item label="API端点" prop="endpoint">
            <el-input
              v-model="formData.endpoint"
              placeholder="请输入自定义API端点（可选）"
            />
            <div class="form-tip">留空使用官方默认地址</div>
          </el-form-item>

          <el-form-item label="模型名称" prop="model">
            <el-input
              v-model="formData.model"
              placeholder="请输入模型名称（可选）"
            />
            <div class="form-tip">留空使用默认模型配置</div>
          </el-form-item>

          <el-form-item class="form-actions">
            <el-button type="primary" size="large" @click="handleSubmit" :loading="loading">
              下一步
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
  llmProvider: 'deepseek',
  apiKey: '',
  botName: '',
  botDescription: '',
  userName: '',
  installPath: '',
  endpoint: '',
  model: ''
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
  ],
  installPath: [
    { max: 200, message: '安装路径长度不能超过200个字符', trigger: 'blur' }
  ]
}

const handleSubmit = () => {
  if (!formRef.value) return

  formRef.value.validate((valid) => {
    if (valid) {
      loading.value = true

      // 保存配置到Pinia
      appStore.updateInstallConfig(formData)

      ElMessage.success('配置信息已保存')

      setTimeout(() => {
        loading.value = false
        router.push('/deps-install')
      }, 500)
    } else {
      ElMessage.error('请填写完整的配置信息')
      return false
    }
  })
}
</script>

<style scoped>
.info-collect-page {
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
