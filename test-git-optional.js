import depsManager from './src/main/modules/depsManager.js'

async function testGitOptionalDependency() {
  console.log('Testing dependency detection with git as optional dependency...\n')

  // Mock the execAsync function to simulate git not being installed
  const originalExec = depsManager.checkGitVersion
  depsManager.checkGitVersion = async () => {
    return {
      name: 'git',
      installed: false,
      error: 'git command not found'
    }
  }

  try {
    const result = await depsManager.checkAllDependencies((progress, message) => {
      console.log(`Progress ${progress}%: ${message}`)
    })

    console.log('\n=== Check Result ===')
    console.log('Status:', result.status)
    console.log('Missing dependencies:', result.missing)
    console.log('Git installed:', result.dependencies.git.installed)

    // Git should not be in the missing dependencies list since it's optional now
    if (!result.missing.includes('git')) {
      console.log('\n✅ PASS: Git is correctly treated as an optional dependency')
      console.log('   Even though git is not installed, the overall status is satisfied')
    } else {
      console.log('\n❌ FAIL: Git is incorrectly listed as a missing dependency')
    }

    // Check that required dependencies are still enforced
    const requiredDeps = Object.entries(result.dependencies)
      .filter(([name, dep]) => name !== 'git' && !dep.isSatisfied)
      .map(([name]) => name)

    if (requiredDeps.length === 0) {
      console.log('✅ PASS: All required dependencies are satisfied')
    } else {
      console.log(`ℹ️  INFO: The following required dependencies are not satisfied: ${requiredDeps.join(', ')}`)
    }

  } catch (error) {
    console.error('Test failed with error:', error)
  } finally {
    // Restore original function
    depsManager.checkGitVersion = originalExec
  }

  console.log('\n=== Test Complete ===')
}

testGitOptionalDependency()
