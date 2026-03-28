<template>
  <Layout>
    <div class="index-page">
      <div class="welcome-section">
        <h2>欢迎使用 Dclaw 安装工具</h2>
        <p>一键安装和配置 openclaw 智能助手，快速搭建企业级AI应用</p>
      </div>

      <div class="card-container">
        <!-- 初次安装openclaw -->
        <div class="main-card" @click="handleInstallNew">
          <div class="card-icon">
            <el-icon size="48" color="#409eff"><Plus /></el-icon>
          </div>
          <div class="card-content">
            <h3>初次安装 openclaw</h3>
            <p>全新安装 openclaw 服务，包含完整的依赖环境和配置向导</p>
          </div>
          <div class="card-arrow">
            <el-icon size="24" color="#c0c4cc"><ArrowRight /></el-icon>
          </div>
        </div>

        <!-- 已有openclaw -->
        <div class="main-card">
          <div class="card-icon">
            <el-icon size="48" color="#67c23a"><Setting /></el-icon>
          </div>
          <div class="card-content">
            <h3>已有 openclaw</h3>
            <p>对已安装的 openclaw 进行管理操作</p>
          </div>
          <div class="sub-buttons">
            <el-button type="primary" @click="handleConfig">
              <el-icon><Setting /></el-icon>
              配置 openclaw
            </el-button>
            <el-button type="success" @click="handleIntegration">
              <el-icon><Connection /></el-icon>
              集成企微
            </el-button>
            <el-button type="info" @click="handleUpdate">
              <el-icon><Refresh /></el-icon>
              更新 openclaw
            </el-button>
            <el-button type="danger" @click="handleUninstall">
              <el-icon><Delete /></el-icon>
              卸载 openclaw
            </el-button>
          </div>
        </div>

        <!-- 启动openclaw -->
        <div class="main-card" @click="handleStart">
          <div class="card-icon">
            <el-icon size="48" color="#e6a23c"><VideoPlay /></el-icon>
          </div>
          <div class="card-content">
            <h3>启动 openclaw</h3>
            <p>启动已安装的 openclaw 服务，访问管理后台</p>
          </div>
          <div class="card-arrow">
            <el-icon size="24" color="#c0c4cc"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Setting, VideoPlay, ArrowRight, Connection, Refresh, Delete } from '@element-plus/icons-vue'
import Layout from '../components/Layout.vue'

const router = useRouter()

const handleInstallNew = () => {
  router.push('/risk')
}

const handleConfig = () => {
  router.push('/config')
}

const handleIntegration = () => {
  router.push('/integration')
}

const handleUpdate = () => {
  router.push('/update')
}

const handleUninstall = () => {
  router.push('/uninstall')
}

const handleStart = async () => {
  try {
    await window.electronAPI.startOpenclaw()
    ElMessage.success('openclaw 服务已启动')
  } catch (error) {
    ElMessage.error('启动失败：' + error.message)
  }
}
</script>

<style scoped>
.index-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.welcome-section {
  text-align: center;
  margin-bottom: 50px;
}

.welcome-section h2 {
  font-size: 32px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 12px;
}

.welcome-section p {
  font-size: 16px;
  color: #606266;
}

.card-container {
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.main-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
}

.main-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: #409eff;
}

.card-icon {
  margin-right: 24px;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
}

.card-content h3 {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.card-content p {
  font-size: 14px;
  color: #606266;
  margin: 0;
}

.card-arrow {
  flex-shrink: 0;
  margin-left: 20px;
}

.sub-buttons {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}
</style>
