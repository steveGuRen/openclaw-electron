<template>
  <div class="progress-container">
    <div class="progress-header">
      <span class="step-name">{{ stepName }}</span>
      <span class="percentage">{{ percentage }}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${percentage}%` }"></div>
    </div>
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

.progress-bar {
  height: 12px;
  background: #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.step-info {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  text-align: right;
}
</style>
