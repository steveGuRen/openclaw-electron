<template>
  <div class="progress-container">
    <div class="progress-header">
      <span class="step-name">{{ stepName }}</span>
      <span class="percentage">{{ percentage }}%</span>
    </div>
    <el-progress
      :percentage="percentage"
      :show-text="false"
      :stroke-height="12"
      class="custom-progress"
    />
    <div class="step-info">
      步骤 {{ currentStep }} / {{ totalSteps }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  currentStep: {
    type: Number,
    required: true
  },
  totalSteps: {
    type: Number,
    required: true
  },
  stepName: {
    type: String,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  }
})
</script>

<style scoped>
.progress-container {
  margin: 20px 0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.step-name {
  font-weight: 500;
  color: #303133;
}

.percentage {
  color: #409eff;
  font-weight: 600;
}

.step-info {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  text-align: right;
}

/* 自定义进度条样式 */
:deep(.custom-progress .el-progress__bar) {
  height: 12px;
  background: #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

:deep(.custom-progress .el-progress__inner) {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px;
  transition: width 0.3s ease;
}
</style>
