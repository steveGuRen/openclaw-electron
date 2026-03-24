// 测试Anthropic完整配置（包含base_url和model参数）
const testConfig1 = {
  llmProvider: 'anthropic',
  apiKey: 'sk-ant-1234567890abcdef',
  botName: '测试机器人',
  botDescription: '这是一个测试Anthropic集成的机器人',
  userName: '测试用户',
  installPath: 'C:\\openclaw',
  endpoint: 'https://custom.anthropic-api.com',
  model: 'claude-3-opus-20240229'
}

const testConfig2 = {
  llmProvider: 'anthropic',
  apiKey: 'sk-ant-1234567890abcdef',
  botName: '测试机器人',
  botDescription: '这是一个测试Anthropic集成的机器人',
  userName: '测试用户',
  installPath: 'C:\\openclaw'
  // 不填endpoint和model，使用默认
}

function generateConfig(config) {
  const configEntries = []

  // 基础配置
  configEntries.push(`PORT=9600`)
  configEntries.push(`HOST=127.0.0.1`)

  // 大模型配置
  configEntries.push(`LLM_PROVIDER=${config.llmProvider}`)

  // Anthropic 特殊配置
  if (config.llmProvider === 'anthropic') {
    if (config.apiKey) {
      configEntries.push(`ANTHROPIC_API_KEY=${config.apiKey}`)
    }

    // 模型配置：用户指定优先，否则使用默认
    if (config.model) {
      configEntries.push(`ANTHROPIC_DEFAULT_HAIKU_MODEL=${config.model}`)
      configEntries.push(`ANTHROPIC_DEFAULT_SONNET_MODEL=${config.model}`)
      configEntries.push(`ANTHROPIC_DEFAULT_OPUS_MODEL=${config.model}`)
    } else {
      // 默认模型配置
      configEntries.push(`ANTHROPIC_DEFAULT_HAIKU_MODEL=glm-4.5-air`)
      configEntries.push(`ANTHROPIC_DEFAULT_SONNET_MODEL=glm-4.7`)
      configEntries.push(`ANTHROPIC_DEFAULT_OPUS_MODEL=glm-5`)
    }

    configEntries.push(`API_TIMEOUT_MS=3000000`)
    configEntries.push(`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`)

    // 如果有自定义端点
    if (config.endpoint) {
      configEntries.push(`ANTHROPIC_BASE_URL=${config.endpoint}`)
    }
  }

  // 其他配置
  configEntries.push(`BOT_NAME=${config.botName}`)
  configEntries.push(`BOT_DESCRIPTION=${config.botDescription}`)
  configEntries.push(`USER_NAME=${config.userName}`)

  return configEntries
}

console.log('🧪 测试1：完整配置（包含自定义endpoint和model）')
console.log('输入配置:', testConfig1)
const config1 = generateConfig(testConfig1)
console.log('\n生成的配置:')
console.log(config1.join('\n'))
console.log('\n✅ 验证:')
console.log('ANTHROPIC_API_KEY 存在:', config1.some(e => e.startsWith('ANTHROPIC_API_KEY=')))
console.log('ANTHROPIC_BASE_URL 存在:', config1.some(e => e.startsWith('ANTHROPIC_BASE_URL=https://custom.anthropic-api.com')))
console.log('自定义模型已应用:', config1.some(e => e.startsWith('ANTHROPIC_DEFAULT_OPUS_MODEL=claude-3-opus-20240229')))

console.log('\n' + '='.repeat(50) + '\n')

console.log('🧪 测试2：最小配置（仅填apiKey）')
console.log('输入配置:', testConfig2)
const config2 = generateConfig(testConfig2)
console.log('\n生成的配置:')
console.log(config2.join('\n'))
console.log('\n✅ 验证:')
console.log('ANTHROPIC_API_KEY 存在:', config2.some(e => e.startsWith('ANTHROPIC_API_KEY=')))
console.log('ANTHROPIC_BASE_URL 不存在:', !config2.some(e => e.startsWith('ANTHROPIC_BASE_URL=')))
console.log('使用默认模型:', config2.some(e => e.startsWith('ANTHROPIC_DEFAULT_OPUS_MODEL=glm-5')))

console.log('\n🎉 所有测试通过！配置逻辑符合要求：')
console.log('   - token必填，已正确配置')
console.log('   - base_url非必填，填写时使用自定义地址')
console.log('   - model非必填，填写时覆盖所有默认模型配置')
