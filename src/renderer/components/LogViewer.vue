<template>
  <div class="log-viewer">
    <div class="log-header">
      <span>安装日志</span>
      <el-button size="small" @click="clearLogs">清空</el-button>
    </div>
    <div class="log-content" ref="logContent">
      <div v-for="(log, index) in logs" :key="index" :class="['log-item', log.type]">
        <span class="log-time">{{ formatTime(log.timestamp) }}</span>
        <span class="log-content-text">{{ log.content }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  logs: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['clear'])

const logContent = ref(null)

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString()
}

const clearLogs = () => {
  emit('clear')
}

watch(() => props.logs, async () => {
  await nextTick()
  if (logContent.value) {
    logContent.value.scrollTop = logContent.value.scrollHeight
  }
}, { deep: true })
</script>

<style scoped>
.log-viewer {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fafafa;
  margin: 20px 0;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #dcdfe6;
  background: white;
  font-weight: 500;
}

.log-content {
  height: 200px;
  overflow-y: auto;
  padding: 10px 15px;
  font-family: monospace;
  font-size: 12px;
}

.log-item {
  margin-bottom: 4px;
  line-height: 1.5;
}

.log-time {
  color: #909399;
  margin-right: 8px;
}

.log-item.info .log-content-text {
  color: #303133;
}

.log-item.warn .log-content-text {
  color: #e6a23c;
}

.log-item.error .log-content-text {
  color: #f56c6c;
}
</style>
