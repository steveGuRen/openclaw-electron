# OpenClaw双模式安装实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现OpenClaw双模式安装功能，优先使用npm全局安装，失败时自动降级到源码安装，提高安装成功率和用户体验。

**Architecture:**
- 在现有openclawManager.js中新增npm安装逻辑
- 实现统一适配层隔离两种安装方式的差异
- 保留原有源码安装逻辑作为降级方案
- 统一配置路径和服务管理接口，兼容两种安装方式的全生命周期操作

**Tech Stack:** Node.js, Electron, npm, git

---

## 文件变更清单
| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `src/main/modules/openclawManager.js` | 修改 | 核心安装逻辑改造，新增npm安装、适配层方法 |
| `src/shared/constants.js` | 修改 | 更新OPENCLAW_CONFIG配置，添加npm包相关常量 |
| `src/main/modules/depsManager.js` | 修改 | 将git从必填依赖改为可选依赖 |
| `test-dual-mode-install.js` | 新增 | 双模式安装功能测试脚本 |

---

### Task 1: 常量配置更新

**Files:**
- Modify: `src/shared/constants.js`

- [ ] **Step 1: 更新OPENCLAW_CONFIG配置**
```javascript
export const OPENCLAW_CONFIG = {
  defaultPort: 9600,
  configFile: '.env',
  repoUrl: 'https://github.com/openclaw/openclaw.git', // 修复仓库地址
  defaultBranch: 'main',
  npmPackageName: '@openclaw-ai/openclaw',
  npmPackageVersion: '^0.1.0', // 锁定主版本
  defaultInstallDir: path.join(os.homedir(), '.dclaw', 'openclaw'),
  configPath: path.join(os.homedir(), '.dclaw', 'openclaw', '.env') // 统一配置路径
}
```

- [ ] **Step 2: 验证配置正确性**
Run: `node -e "import('./src/shared/constants.js').then(c => console.log(c.OPENCLAW_CONFIG))"`
Expected: 输出正确的配置项，无语法错误

- [ ] **Step 3: 提交变更**
```bash
git add src/shared/constants.js
git commit -m "feat: update openclaw config for dual-mode installation"
```

---

### Task 2: 依赖检测逻辑优化

**Files:**
- Modify: `src/main/modules/depsManager.js`

- [ ] **Step 1: 将git从必填依赖改为可选依赖**
找到dependencies配置中的git部分，修改isRequired为false：
```javascript
git: {
  name: 'Git',
  command: 'git --version',
  regex: /git version (\d+\.\d+\.\d+)/,
  minVersion: '2.30.0',
  isRequired: false, // 改为可选，仅源码安装需要
  installLink: 'https://git-scm.com/downloads'
}
```

- [ ] **Step 2: 测试依赖检测**
Run: `node test-deps.js`
Expected: git不再是必填依赖，检测通过

- [ ] **Step 3: 提交变更**
```bash
git add src/main/modules/depsManager.js
git commit -m "feat: make git optional dependency for npm installation"
```

---

### Task 3: 新增npm安装方法

**Files:**
- Modify: `src/main/modules/openclawManager.js`

- [ ] **Step 1: 添加installViaNpm方法**
```javascript
/**
 * 通过npm全局安装OpenClaw
 */
async installViaNpm(log) {
  try {
    log('开始通过npm安装OpenClaw...')

    // 检测是否已安装
    try {
      const versionResult = await systemWorkerManager.executeCommandAsync({
        command: 'openclaw',
        args: ['--version'],
        timeout: 5000
      })

      if (versionResult.code === 0) {
        const version = versionResult.stdout.trim()
        log(`检测到已安装OpenClaw版本: ${version}`)
        // TODO: 版本兼容性检测
        return { success: true, version, alreadyInstalled: true }
      }
    } catch (e) {
      // 未安装，继续
    }

    // 构造安装命令
    const npmArgs = [
      'install',
      '-g',
      `${OPENCLAW_CONFIG.npmPackageName}@${OPENCLAW_CONFIG.npmPackageVersion}`
    ]

    // 复用npm镜像配置
    const env = { ...process.env }
    if (depsManager.npmRegistry) {
      env.npm_config_registry = depsManager.npmRegistry
    }

    log(`执行安装命令: npm ${npmArgs.join(' ')}`)

    const installResult = await systemWorkerManager.executeCommandAsync({
      command: 'npm',
      args: npmArgs,
      env,
      timeout: 120000, // 2分钟超时
      onStdout: (data) => log(data.trim()),
      onStderr: (data) => log(data.trim())
    })

    if (installResult.code !== 0) {
      throw new Error(`npm安装失败，退出码: ${installResult.code}`)
    }

    // 验证安装结果
    const verifyResult = await systemWorkerManager.executeCommandAsync({
      command: 'openclaw',
      args: ['--version'],
      timeout: 5000
    })

    if (verifyResult.code !== 0) {
      throw new Error('安装完成但验证失败，openclaw命令不可用')
    }

    const version = verifyResult.stdout.trim()
    log(`npm安装成功，版本: ${version}`)

    return { success: true, version }
  } catch (error) {
    log(`npm安装失败: ${error.message}`)
    // 清理半安装的包
    try {
      await systemWorkerManager.executeCommandAsync({
        command: 'npm',
        args: ['uninstall', '-g', OPENCLAW_CONFIG.npmPackageName],
        timeout: 30000
      })
    } catch (e) {
      log(`清理半安装包失败: ${e.message}`)
    }
    throw error
  }
}
```

- [ ] **Step 2: 测试方法语法正确性**
Run: `node -c src/main/modules/openclawManager.js`
Expected: 无语法错误

- [ ] **Step 3: 提交变更**
```bash
git add src/main/modules/openclawManager.js
git commit -m "feat: add npm installation method"
```

---

### Task 4: 实现统一适配层方法

**Files:**
- Modify: `src/main/modules/openclawManager.js`

- [ ] **Step 1: 添加detectInstallationType方法**
```javascript
/**
 * 检测安装类型
 * @returns {'npm'|'source'|null}
 */
async detectInstallationType() {
  // 优先检测npm安装
  try {
    const result = await systemWorkerManager.executeCommandAsync({
      command: 'openclaw',
      args: ['--version'],
      timeout: 3000
    })
    if (result.code === 0) {
      return 'npm'
    }
  } catch (e) {
    // 不是npm安装
  }

  // 检测源码安装
  try {
    const packageJsonPath = path.join(this.installDir, 'package.json')
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath)
      if (packageJson.name === 'openclaw') {
        return 'source'
      }
    }
  } catch (e) {
    // 不是源码安装
  }

  return null
}
```

- [ ] **Step 2: 添加getConfigFilePath方法**
```javascript
/**
 * 获取统一配置文件路径
 */
getConfigFilePath() {
  return OPENCLAW_CONFIG.configPath
}
```

- [ ] **Step 3: 添加startService方法**
```javascript
/**
 * 统一服务启动接口
 */
async startService(log) {
  const installType = await this.detectInstallationType()

  if (!installType) {
    throw new Error('未检测到OpenClaw安装')
  }

  log(`使用${installType === 'npm' ? 'npm版本' : '源码版本'}启动服务`)

  let command, args, cwd

  if (installType === 'npm') {
    command = 'openclaw'
    args = ['start', '--config', this.getConfigFilePath()]
    cwd = os.homedir()
  } else {
    command = 'npm'
    args = ['start']
    cwd = this.installDir
    // 源码版本通过环境变量传递配置路径
    process.env.OPENCLAW_CONFIG_PATH = this.getConfigFilePath()
  }

  const result = await systemWorkerManager.executeCommandAsync({
    command,
    args,
    cwd,
    env: { ...process.env },
    timeout: 30000,
    onStdout: (data) => log(data.trim()),
    onStderr: (data) => log(data.trim())
  })

  if (result.code !== 0) {
    throw new Error(`服务启动失败，退出码: ${result.code}`)
  }

  return { success: true, accessUrl: `http://localhost:${OPENCLAW_CONFIG.defaultPort}` }
}
```

- [ ] **Step 4: 测试方法语法正确性**
Run: `node -c src/main/modules/openclawManager.js`
Expected: 无语法错误

- [ ] **Step 5: 提交变更**
```bash
git add src/main/modules/openclawManager.js
git commit -m "feat: add unified adapter layer methods"
```

---

### Task 5: 改造主安装流程，实现双模式逻辑

**Files:**
- Modify: `src/main/modules/openclawManager.js`

- [ ] **Step 1: 修改install方法的主流程**
找到install方法中的步骤1（检查依赖）之后的逻辑，替换为：
```javascript
      // 步骤2: 尝试npm安装
      progressCallback?.(20, '尝试通过npm安装OpenClaw...')
      let installType = 'npm'
      try {
        await this.installViaNpm(log)
      } catch (npmError) {
        log(`npm安装失败，降级到源码安装: ${npmError.message}`)
        installType = 'source'

        // 源码安装需要git，检查是否已安装
        const gitStatus = depsManager.depsStatus.git
        if (!gitStatus?.isSatisfied) {
          throw new Error('npm安装失败，且未检测到Git环境，无法进行源码安装')
        }

        // 步骤3: 源码安装流程
        progressCallback?.(25, '开始源码安装...')

        // 检查现有安装
        progressCallback?.(30, '检查现有安装...')
        const existingInstances = await this.scanExistingInstances()
        if (existingInstances.length > 0) {
          log(`检测到 ${existingInstances.length} 个现有OpenClaw实例`)
        }

        // 创建安装目录
        progressCallback?.(35, '创建安装目录...')
        log(`创建安装目录: ${this.installDir}`)
        await fs.mkdir(this.installDir, { recursive: true })

        // 克隆仓库
        progressCallback?.(40, '克隆OpenClaw仓库...')
        log(`克隆仓库: ${OPENCLAW_CONFIG.repoUrl}`)
        await this.cloneRepository(log, env)

        // 安装依赖
        progressCallback?.(60, '安装项目依赖...')
        await this.installDependencies(log, env)
      }

      // 记录安装类型
      await state.set('openclaw.installType', installType)
      log(`安装类型: ${installType}`)

      // 步骤4: 写入配置文件
      progressCallback?.(80, '写入配置文件...')
      log('写入配置文件')
      await this.writeConfig(config, log)

      // 步骤5: 启动服务
      progressCallback?.(90, '启动服务...')
      log('初始化服务')
      const startResult = await this.startService(log)

      progressCallback?.(100, '安装完成')
      log('OpenClaw安装成功')

      return {
        success: true,
        installType,
        accessUrl: startResult.accessUrl
      }
```

- [ ] **Step 2: 测试方法语法正确性**
Run: `node -c src/main/modules/openclawManager.js`
Expected: 无语法错误

- [ ] **Step 3: 提交变更**
```bash
git add src/main/modules/openclawManager.js
git commit -m "feat: implement dual-mode installation main flow"
```

---

### Task 6: 适配配置写入逻辑到统一路径

**Files:**
- Modify: `src/main/modules/openclawManager.js`

- [ ] **Step 1: 修改writeConfig方法中的配置路径**
找到writeConfig方法中的configPath定义：
```javascript
const configPath = this.getConfigFilePath()
// 确保目录存在
await fs.mkdir(path.dirname(configPath), { recursive: true })
```

- [ ] **Step 2: 测试配置写入逻辑**
Run: 创建测试脚本验证配置写入到正确路径
```javascript
import openclawManager from './src/main/modules/openclawManager.js'
const config = {
  llmProvider: 'anthropic',
  apiKey: 'test-key',
  botName: 'test-bot'
}
await openclawManager.writeConfig(config, console.log)
console.log('配置文件路径:', openclawManager.getConfigFilePath())
```
Expected: 配置文件写入到~/.dclaw/openclaw/.env

- [ ] **Step 3: 提交变更**
```bash
git add src/main/modules/openclawManager.js
git commit -m "feat: adapt config writing to unified path"
```

---

### Task 7: 测试与验证

**Files:**
- Create: `test-dual-mode-install.js`

- [ ] **Step 1: 编写测试脚本**
```javascript
import openclawManager from './src/main/modules/openclawManager.js'

async function testDualMode() {
  console.log('测试双模式安装功能...')

  // 测试配置路径
  console.log('配置文件路径:', openclawManager.getConfigFilePath())

  // 测试安装类型检测
  const installType = await openclawManager.detectInstallationType()
  console.log('当前安装类型:', installType)

  console.log('测试完成')
}

testDualMode().catch(console.error)
```

- [ ] **Step 2: 运行测试脚本**
Run: `node test-dual-mode-install.js`
Expected: 无报错，输出正确信息

- [ ] **Step 3: 提交测试文件**
```bash
git add test-dual-mode-install.js
git commit -m "test: add dual-mode installation test script"
```

---

### Task 8: 全流程端到端测试

- [ ] **Step 1: 启动应用测试完整流程**
Run: `npm run electron:dev`
Expected: 安装流程正常，优先尝试npm安装，失败时自动降级到源码安装

- [ ] **Step 2: 验证安装结果**
检查配置文件是否写入到~/.dclaw/openclaw/.env，服务是否正常启动

---

## 验收标准
1. ✅ npm安装流程正常工作
2. ✅ npm安装失败时自动降级到源码安装
3. ✅ 两种安装方式下配置都写入到统一路径
4. ✅ 服务能够正常启动
5. ✅ git不再是必填依赖
6. ✅ 原有功能不受影响
