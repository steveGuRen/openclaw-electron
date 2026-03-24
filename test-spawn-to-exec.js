import systemWorkerManager from './src/main/modules/systemWorkerManager.js'

async function testExec() {
  console.log('=== 测试 exec 命令执行 ===\n')

  // 测试 1: 简单命令
  console.log('测试 1: node --version')
  try {
    const result = await systemWorkerManager.executeCommandAsync({
      command: 'node',
      args: ['--version'],
      timeout: 5000
    })
    console.log(`✓ 成功! 退出码: ${result.code}`)
    console.log(`  输出: ${result.stdout.trim()}`)
  } catch (e) {
    console.error(`✗ 失败: ${e.message}`)
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // 测试 2: npm --version
  console.log('测试 2: npm --version')
  try {
    const result = await systemWorkerManager.executeCommandAsync({
      command: 'npm',
      args: ['--version'],
      timeout: 5000
    })
    console.log(`✓ 成功! 退出码: ${result.code}`)
    console.log(`  输出: ${result.stdout.trim()}`)
  } catch (e) {
    console.error(`✗ 失败: ${e.message}`)
  }

  console.log('\n=== 测试完成 ===')
}

testExec().catch(console.error)
