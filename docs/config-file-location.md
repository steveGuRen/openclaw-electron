# OpenClaw 配置文件存储位置分析

## 配置文件存储位置

当你看到 "Existing config detected" 提示，显示 `workspace: ~\.openclaw\workspace` 和 `gateway.mode: local` 等配置时，这些配置实际上存储在以下位置：

### 默认配置文件路径

```
~/.openclaw/openclaw.json
```

### 配置文件查找优先级

OpenClaw 会按照以下优先级查找配置文件：

1. **环境变量指定路径**：
   - `OPENCLAW_CONFIG_PATH` 环境变量
   - `CLAWDBOT_CONFIG_PATH` 环境变量（旧版本兼容）

2. **状态目录下的配置文件**：
   - 优先使用 `~/.openclaw/openclaw.json`
   - 如果不存在，会检查旧的状态目录：
     - `~/.clawdbot/openclaw.json`
     - `~/.moldbot/openclaw.json`
     - `~/.moltbot/openclaw.json`
   - 也会检查旧的配置文件名：
     - `clawdbot.json`
     - `moldbot.json`
     - `moltbot.json`

3. **状态目录位置**：
   - 默认：`~/.openclaw`
   - 可通过 `OPENCLAW_STATE_DIR` 环境变量覆盖
   - 也会检查旧的状态目录位置

## 配置文件结构

配置文件是一个 JSON 或 JSON5 格式的文件，包含以下主要部分：

- **gateway**：网关配置，包括模式（local/remote）、端口、认证等
- **agents**：代理配置，包括工作区目录、默认设置等
- **models**：模型配置，包括提供商、API 密钥等
- **tools**：工具配置，包括网络搜索、执行命令等
- **channels**：通道配置，包括 Discord、Telegram 等
- **meta**：元数据，包括最后修改版本、时间等

## 技术实现细节

### 配置文件读取

1. **路径解析**：`resolveConfigPath` 函数解析配置文件路径
2. **文件读取**：`readConfigFileSnapshot` 函数读取配置文件
3. **格式解析**：支持 JSON5 格式，更灵活的语法
4. **环境变量替换**：支持 `${VAR}` 格式的环境变量替换
5. **配置包含**：支持 `$include` 指令包含其他配置文件

### 配置文件写入

1. **验证**：`validateConfigObjectRawWithPlugins` 验证配置有效性
2. **环境变量恢复**：`restoreEnvVarRefs` 恢复环境变量引用
3. **版本标记**：`stampConfigVersion` 添加版本和时间戳
4. **权限设置**：确保配置目录权限为 700，保护敏感信息

### 配置加载流程

1. 解析配置文件路径
2. 读取配置文件内容
3. 解析 JSON5 格式
4. 处理 `$include` 指令
5. 替换环境变量
6. 应用默认值
7. 验证配置有效性
8. 应用运行时覆盖
9. 返回配置对象

## 示例配置文件

```json
{
  "meta": {
    "lastTouchedVersion": "0.1.0",
    "lastTouchedAt": "2026-03-28T12:00:00.000Z"
  },
  "gateway": {
    "mode": "local",
    "port": 18789,
    "auth": {
      "mode": "token",
      "token": "your-token-here"
    }
  },
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace"
    }
  },
  "models": {
    "providers": {
      "openai": {
        "apiKey": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

## 总结

OpenClaw 的配置文件默认存储在 `~/.openclaw/openclaw.json`，支持环境变量覆盖路径，并且会向后兼容旧的配置文件位置和格式。配置文件包含了网关、代理、模型等各种设置，是 OpenClaw 运行的核心配置文件。

当你看到 "Existing config detected" 提示时，系统已经找到了并加载了这个配置文件，显示的配置信息就是从该文件中读取的。