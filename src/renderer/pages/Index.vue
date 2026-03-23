<template>
  <Layout>
    <div class="index-page">
    <div class="hero-section">
      <h1 class="title">欢迎使用 Dclaw</h1>
      <p class="subtitle">openclaw 一键安装与企微集成工具</p>
    </div>

    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">🚀</div>
        <h3>一键安装</h3>
        <p>自动检测并安装所有依赖，无需手动配置</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🔒</div>
        <h3>安全可靠</h3>
        <p>所有敏感信息加密存储，保障数据安全</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🤖</div>
        <h3>自动化集成</h3>
        <p>自动完成企微机器人配置，无需手动操作</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>快速部署</h3>
        <p>几分钟内完成整个安装配置流程</p>
      </div>
    </div>

    <div class="action-section">
      <el-button type="primary" size="large" @click="startInstallation">
        开始安装
      </el-button>
    </div>
  </div>

    <!-- 组件测试区域 -->
    <div class="component-test-section" style="margin-top: 40px; padding: 20px; background: white; border-radius: 8px;">
      <h3 style="margin-bottom: 20px; font-size: 18px;">组件测试区域</h3>

      <!-- ProgressBar 组件测试 -->
      <div style="margin-bottom: 30px;">
        <h4 style="margin-bottom: 10px; font-size: 16px;">ProgressBar 组件</h4>
        <ProgressBar
          :current-step="2"
          :total-steps="5"
          step-name="依赖安装中"
          :percentage="40"
        />
      </div>

      <!-- LogViewer 组件测试 -->
      <div style="margin-bottom: 30px;">
        <h4 style="margin-bottom: 10px; font-size: 16px;">LogViewer 组件</h4>
        <LogViewer :logs="testLogs" @clear="clearTestLogs" />
      </div>

      <!-- ErrorTip 组件测试 -->
      <div style="margin-bottom: 30px;">
        <h4 style="margin-bottom: 10px; font-size: 16px;">ErrorTip 组件</h4>
        <ErrorTip
          title="安装失败"
          description="依赖安装过程中出现错误，请检查网络连接后重试"
          detail="npm ERR! 404 Not Found - GET https://registry.npmjs.org/some-package - Not found
npm ERR! A complete log of this run can be found in:
npm ERR!     C:\Users\user\AppData\Roaming\npm-cache\_logs\2026-03-23T12_00_00_000Z-debug.log"
        />
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import Layout from '../components/Layout.vue'
import ProgressBar from '../components/ProgressBar.vue'
import LogViewer from '../components/LogViewer.vue'
import ErrorTip from '../components/ErrorTip.vue'

const router = useRouter()

// 测试日志数据
const testLogs = ref([
  { type: 'info', content: '开始检查系统环境...', timestamp: new Date() },
  { type: 'info', content: '检测到操作系统: Windows 11', timestamp: new Date() },
  { type: 'info', content: '开始下载依赖包...', timestamp: new Date() },
  { type: 'warn', content: '部分依赖包下载速度较慢', timestamp: new Date() },
  { type: 'info', content: '正在安装 Node.js 依赖...', timestamp: new Date() },
  { type: 'error', content: '某个依赖包安装失败', timestamp: new Date() },
  { type: 'info', content: '重试安装...', timestamp: new Date() },
  { type: 'info', content: '依赖安装完成', timestamp: new Date() }
])

const clearTestLogs = () => {
  testLogs.value = []
}

const startInstallation = () => {
  router.push('/risk')
}
</script>

<style scoped>
.index-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.hero-section {
  text-align: center;
  margin-bottom: 60px;
  color: white;
}

.title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.subtitle {
  font-size: 20px;
  opacity: 0.95;
  font-weight: 300;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  max-width: 800px;
  margin-bottom: 60px;
}

.feature-card {
  background: white;
  padding: 32px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #303133;
}

.feature-card p {
  color: #606266;
  line-height: 1.6;
}

.action-section {
  text-align: center;
}
</style>
