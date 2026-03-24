---
name: spawn-to-exec-replacement
description: 将 systemWorker 中的 child_process.spawn 替换为 child_process.exec
type: project
---

# Spawn to Exec Replacement Design

**Goal:** 全局替换项目中使用的 child_process.spawn 为 child_process.exec，简化命令执行代码，与参考项目 npm-install-test 保持一致的技术方案。

## Context

当前项目使用 `spawn` 方式执行系统命令，需要逐块收集和处理输出流，代码相对复杂。参考项目 `npm-install-test` 使用更简单的 `exec` 方式，自动缓冲输出，代码更易读和维护。

## Design

### 1. 核心变更文件

**主要修改：**
- `src/workers/systemWorker.js` - 重写 executeCommand 函数，使用 exec 替代 spawn
- `src/main/modules/systemWorkerManager.js` - 保持接口不变，内部适配 exec 的回调方式

**保持不变：**
- 安全校验逻辑（security.validateCommand）
- 内置工具路径检测逻辑
- 任务管理和超时处理
- 主进程 API 接口

### 2. executeCommand 重写

```javascript
const executeCommand = async (options) => {
  let { command, args = [], cwd, env = {}, taskId, shell = false, timeout = 3600000 } = options

  try {
    // 安全校验（保持不变）
    if (!security.validateCommand(command, args)) {
      throw new Error(`命令不被允许: ${command}`)
    }

    // 优先使用内置工具（保持不变）
    let resourcesPath = process.resourcesPath
    if (!resourcesPath && process.env.NODE_ENV === 'development') {
      resourcesPath = path.join(process.cwd(), 'resources')
    } else if (!resourcesPath) {
      resourcesPath = path.join(process.execPath, '../resources')
    }
    const binPath = path.join(resourcesPath, 'bin')

    const builtInTools = {
      'git': path.join(binPath, 'git', 'cmd', 'git.exe'),
      'pnpm': path.join(binPath, 'pnpm.exe'),
      'npm': path.join(binPath, 'npm', 'bin', 'npm-cli.js')
    }

    if (builtInTools[command]) {
      const toolPath = builtInTools[command]
      try {
        await fs.access(toolPath)
        if (toolPath.endsWith('.js')) {
          args = [toolPath, ...args]
          command = process.execPath
        } else {
          command = toolPath
        }
        shell = false
        console.log(`使用内置工具: ${command}`)
      } catch (e) {
        console.log(`内置工具不存在，使用系统命令: ${command}`, e.message)
      }
    }

    // 合并命令和参数为字符串
    const cmdStr = shell
      ? `${command} ${args.map(arg => arg.includes(' ') ? `"${arg}"` : arg).join(' ')}`
      : [command, ...args.map(arg => arg.includes(' ') ? `"${arg}"` : arg)].join(' ')

    console.log(`执行命令: ${cmdStr}`)

    // 使用 exec 执行命令
    exec(cmdStr, {
      cwd,
      env,
      shell,
      windowsHide: true,
      timeout,
      maxBuffer: 1024 * 1024 * 100 // 100MB 缓冲区，防止输出过大
    }, (error, stdout, stderr) => {
      if (error) {
        // 处理超时
        if (error.code === 'ETIMEDOUT') {
          parentPort.postMessage({
            type: 'error',
            taskId,
            error: `命令执行超时（${timeout}ms）`
          })
        } else {
          parentPort.postMessage({
            type: 'error',
            taskId,
            error: `命令执行失败: ${error.message}`,
            code: error.code,
            stdout: security.desensitizeLog(stdout),
            stderr: security.desensitizeLog(stderr)
          })
        }
        return
      }

      // 命令成功执行
      parentPort.postMessage({
        type: 'exit',
        taskId,
        code: 0,
        stdout: security.desensitizeLog(stdout),
        stderr: security.desensitizeLog(stderr)
      })
    })

  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      taskId,
      error: error.message
    })
  }
}
```

### 3. 超时管理

由于 `exec` 内置支持超时参数，不再需要手动设置定时器：

```javascript
// 原代码（spawn）
const timeoutId = setTimeout(() => {
  childProcess.kill('SIGTERM')
  // ...
}, timeout)

// 新代码（exec）
// 在 exec 选项中直接设置 timeout 参数，超时会自动报错
```

### 4. 错误处理优化

使用 `exec` 后，错误处理会更简单，因为可以一次性获取完整的 stdout 和 stderr：

```javascript
exec(cmdStr, options, (error, stdout, stderr) => {
  if (error) {
    // 统一处理错误，包含完整输出
    parentPort.postMessage({
      type: 'error',
      taskId,
      error: error.message,
      code: error.code,
      stdout: security.desensitizeLog(stdout),
      stderr: security.desensitizeLog(stderr)
    })
  }
})
```

## Benefits

1. **代码简化**：减少逐块收集输出的复杂性
2. **更符合参考代码风格**：与 npm-install-test 项目保持一致
3. **易维护性**：exec 方式在处理简单命令时代码更易读
4. **保持现有功能**：安全校验、内置工具检测、超时处理等核心功能保持不变

## Verification

### 测试策略

1. 保持现有测试脚本不变（test-deps.js, test-dual-mode-install.js 等）
2. 验证所有命令执行功能正常
3. 重点测试：npm 安装、源码安装、服务启动等核心流程

### 验收标准

- 所有测试通过
- 两种安装方式正常工作
- 服务能够正常启动和停止
- 与原 spawn 方式功能一致，但实现更简单
