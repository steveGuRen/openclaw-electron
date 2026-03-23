<template>
  <Layout>
    <div class="integration-select-page">
      <div class="header-section">
        <el-button @click="goBack" icon="ArrowLeft" type="text">
          返回
        </el-button>
        <h2>选择集成方式</h2>
        <p class="subtitle">请选择适合您的企业微信集成方式</p>
      </div>

      <div class="card-container">
        <el-card class="integration-card" shadow="hover" @click="goToAutoIntegration">
          <div class="card-content">
            <div class="card-icon auto-icon">
              <el-icon size="48"><MagicStick /></el-icon>
            </div>
            <div class="card-info">
              <h3>自动集成</h3>
              <p>一键自动完成企业微信集成配置，无需手动操作，适合快速部署。</p>
              <el-button type="primary" class="card-btn">
                开始自动集成
                <el-icon class="btn-icon"><ArrowRight /></el-icon>
              </el-button>
            </div>
          </div>
        </el-card>

        <el-card class="integration-card" shadow="hover" @click="goToManualIntegration">
          <div class="card-content">
            <div class="card-icon manual-icon">
              <el-icon size="48"><Setting /></el-icon>
            </div>
            <div class="card-info">
              <h3>手动集成</h3>
              <p>手动配置企业微信应用参数，适合需要自定义配置的高级用户。</p>
              <el-button type="primary" class="card-btn">
                开始手动集成
                <el-icon class="btn-icon"><ArrowRight /></el-icon>
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, MagicStick, Setting } from '@element-plus/icons-vue'
import Layout from '../components/Layout.vue'

const router = useRouter()

const goBack = () => {
  router.back()
}

const goToAutoIntegration = () => {
  router.push('/integration/auto')
}

const goToManualIntegration = () => {
  router.push('/integration/manual')
}
</script>

<style scoped>
.integration-select-page {
  max-width: 1000px;
  margin: 0 auto;
}

.header-section {
  text-align: center;
  margin-bottom: 60px;
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

.card-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  max-width: 900px;
  margin: 0 auto;
}

.integration-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #e4e7ed;
}

.integration-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}

.card-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.auto-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.manual-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.card-info h3 {
  font-size: 22px;
  color: #303133;
  margin-bottom: 12px;
}

.card-info p {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 24px;
  min-height: 60px;
}

.card-btn {
  width: 100%;
}

.btn-icon {
  margin-left: 8px;
}

@media (max-width: 768px) {
  .card-container {
    grid-template-columns: 1fr;
  }
}
</style>
