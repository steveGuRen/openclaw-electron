<template>
  <div class="layout">
    <div class="header">
      <h1>Dclaw - openclaw 一键安装工具</h1>
    </div>
    <div class="content">
      <slot />
    </div>
    <div class="footer">
      <p>© 2026 Dclaw Team</p>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.header {
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  padding: 0 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.content {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
}

.footer {
  height: 40px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid #e4e7ed;
  color: #909399;
  font-size: 12px;
}
</style>
