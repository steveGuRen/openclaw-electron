<template>
  <Layout>
    <div class="risk-page">
      <div class="risk-container">
        <div class="risk-header">
          <el-icon size="48" color="#f56c6c"><Warning /></el-icon>
          <h2>重要提示与免责声明</h2>
        </div>

        <div class="risk-content">
          <div class="content-section">
            <h3>1. 使用风险提示</h3>
            <p>本工具为开源软件，旨在帮助用户快速部署和配置 openclaw 服务。使用本工具进行系统操作、软件安装、配置修改等行为可能存在以下风险：</p>
            <ul>
              <li>系统环境兼容性问题可能导致现有软件运行异常</li>
              <li>网络问题可能导致依赖安装失败或服务不可用</li>
              <li>配置错误可能导致服务无法正常启动或数据丢失</li>
              <li>第三方服务（大模型API、企业微信等）的变更可能导致集成功能失效</li>
            </ul>
          </div>

          <div class="content-section">
            <h3>2. 免责声明</h3>
            <p>在法律允许的最大范围内：</p>
            <ul>
              <li>本软件按"现状"提供，不提供任何明示或暗示的担保，包括但不限于对适销性、特定用途适用性和非侵权性的担保</li>
              <li>开发者不对因使用本软件而产生的任何直接、间接、偶然、特殊、惩戒性或后果性损害承担责任</li>
              <li>用户需自行承担使用本软件的全部风险，包括但不限于系统损坏、数据丢失、业务中断等</li>
              <li>用户使用本工具集成第三方服务时，需遵守相应服务的使用条款和隐私政策</li>
            </ul>
          </div>

          <div class="content-section">
            <h3>3. 用户承诺</h3>
            <p>点击"我已阅读并同意"按钮，即表示您：</p>
            <ul>
              <li>已充分理解并接受本声明的全部内容</li>
              <li>承诺将本工具用于合法合规的用途</li>
              <li>自行承担使用本工具产生的所有后果</li>
              <li>同意开发者无需对您使用本工具产生的任何损失负责</li>
            </ul>
          </div>
        </div>

        <div class="risk-actions">
          <el-button size="large" @click="handleReject">
            不同意，退出
          </el-button>
          <el-button type="primary" size="large" @click="handleAgree">
            我已阅读并同意
          </el-button>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import Layout from '../components/Layout.vue'

const router = useRouter()

const handleAgree = () => {
  router.push('/info')
}

const handleReject = () => {
  ElMessageBox.confirm(
    '您确定要退出安装程序吗？',
    '确认退出',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    window.close()
  }).catch(() => {
    // 取消操作
  })
}
</script>

<style scoped>
.risk-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.risk-container {
  max-width: 800px;
  width: 100%;
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.risk-header {
  text-align: center;
  margin-bottom: 30px;
}

.risk-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin-top: 16px;
  margin-bottom: 8px;
}

.risk-content {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 10px;
  margin-bottom: 30px;
}

.content-section {
  margin-bottom: 24px;
}

.content-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.content-section p {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 8px;
}

.content-section ul {
  margin: 0;
  padding-left: 20px;
}

.content-section li {
  color: #606266;
  line-height: 1.8;
  margin-bottom: 4px;
}

.risk-actions {
  display: flex;
  justify-content: space-between;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}
</style>
