import path from 'path'
import os from 'os'

export const OPENCLAW_CONFIG = {
  defaultPort: 9600,
  configFile: '.env',
  repoUrl: 'https://github.com/openclaw/openclaw.git',
  defaultBranch: 'main',
  npmPackageName: '@openclaw-ai/openclaw',
  npmPackageVersion: '^0.1.0',
  defaultInstallDir: path.join(os.homedir(), '.dclaw', 'openclaw'),
  configPath: path.join(os.homedir(), '.dclaw', 'openclaw', '.env')
}
