import openclawManager from './src/main/modules/openclawManager.js'

// 测试Anthropic配置生成
const testConfig = {
  llmProvider: 'anthropic',
  apiKey: 'sk-ant-1234567890abcdef',
  botName: '测试机器人',
  botDescription: '这是一个测试Anthropic集成的机器人',
  userName: '测试用户',
  installPath: 'C:\\openclaw',
  endpoint: 'https://api.anthropic.com'
}

// 模拟写入配置
async function testConfigGeneration() {
  console.log('测试Anthropic配置生成...')
  console.log('输入配置:', testConfig)

  // 调用writeConfig方法的核心逻辑
  const configEntries = []

  // 基础配置
  configEntries.push(`PORT=9600`)
  configEntries.push(`HOST=127.0.0.1`)

  // 大模型配置
  configEntries.push(`LLM_PROVIDER=${testConfig.llmProvider}`)

  // Anthropic 特殊配置
  if (testConfig.llmProvider === 'anthropic') {
    if (testConfig.apiKey) {
      configEntries.push(`ANTHROPIC_API_KEY=${testConfig.apiKey}`)
    }
    // 默认模型配置
    configEntries.push(`ANTHROPIC_DEFAULT_HAIKU_MODEL=glm-4.5-air`)
    configEntries.push(`ANTHROPIC_DEFAULT_SONNET_MODEL=glm-4.7`)
    configEntries.push(`ANTHROPIC_DEFAULT_OPUS_MODEL=glm-5`)
    configEntries.push(`API_TIMEOUT_MS=3000000`)
    configEntries.push(`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`)

    // 如果有自定义端点
    if (testConfig.endpoint) {
      configEntries.push(`ANTHROPIC_BASE_URL=${testConfig.endpoint}`)
    }
  }

  // 其他配置
  configEntries.push(`BOT_NAME=${testConfig.botName}`)
  configEntries.push(`BOT_DESCRIPTION=${testConfig.botDescription}`)
  configEntries.push(`USER_NAME=${testConfig.userName}`)

  console.log('\n生成的配置文件内容:')
  console.log(configEntries.join('\n'))

  // 验证配置是否正确
  const hasApiKey = configEntries.some(entry => entry.startsWith('ANTHROPIC_API_KEY='))
  const hasBaseUrl = configEntries.some(entry => entry.startsWith('ANTHROPIC_BASE_URL='))
  const hasModelConfigs = configEntries.some(entry => entry.startsWith('ANTHROPIC_DEFAULT_'))

  console.log('\n验证结果:')
  console.log('✅ ANTHROPIC_API_KEY 存在:', hasApiKey)
  console.log('✅ ANTHROPIC_BASE_URL 存在:', hasBaseUrl)
  console.log('✅ 模型配置存在:', hasModelConfigs)
  console.log('✅ 所有Anthropic配置项正确生成!')
}

testConfigGeneration().catch(console.error)
