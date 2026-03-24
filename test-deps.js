import DepsManager from './src/main/modules/depsManager.js'

async function testDeps() {
  console.log('开始检测依赖...')
  const result = await DepsManager.checkAllDependencies((progress, message) => {
    console.log(`[${progress}%] ${message}`)
  })

  console.log('\n检测结果:', result.status)
  console.log('缺失的依赖:', result.missing)
  console.log('\n详细信息:')
  console.log('系统支持:', result.system.isSupported, result.system.systemInfo)
  console.log('内存足够:', result.memory.hasEnough, `总内存: ${(result.memory.total / 1024 / 1024 / 1024).toFixed(2)}GB`)
  console.log('磁盘足够:', result.diskSpace.hasEnough, `可用空间: ${(result.diskSpace.free / 1024 / 1024 / 1024).toFixed(2)}GB`)

  Object.values(result.dependencies).forEach(dep => {
    if (dep.name) {
      console.log(`${dep.name}: installed=${dep.installed}, version=${dep.version || 'N/A'}, satisfied=${dep.isSatisfied}, required=${dep.minVersion || 'N/A'}`)
    }
  })
}

testDeps().catch(console.error)
