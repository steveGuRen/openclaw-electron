<template>
  <el-alert
    :title="title"
    type="error"
    :description="description"
    show-icon
    closable
  >
    <template #default>
      <div v-if="showDetail" class="error-detail">
        <el-divider />
        <pre>{{ detail }}</pre>
      </div>
      <el-button type="text" @click="showDetail = !showDetail">
        {{ showDetail ? '收起详情' : '查看详情' }}
      </el-button>
    </template>
  </el-alert>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '操作失败'
  },
  description: {
    type: String,
    required: true
  },
  detail: {
    type: String,
    default: ''
  }
})

const showDetail = ref(false)
</script>

<style scoped>
.error-detail {
  margin-top: 10px;
}

pre {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  color: #f56c6c;
}
</style>
