import { Worker } from 'worker_threads'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Test system worker with built-in tools
const worker = new Worker(path.join(__dirname, 'src', 'workers', 'systemWorker.js'))

let taskId = 1

worker.on('message', (message) => {
  console.log('Worker message:', message)
  if (message.type === 'exit' || message.type === 'error') {
    taskId++
    if (taskId <= 3) {
      runNextTest()
    } else {
      worker.terminate()
    }
  }
})

function runNextTest() {
  switch (taskId) {
    case 1:
      console.log('\nTest 1: Run git --version using built-in git')
      worker.postMessage({
        type: 'execute',
        payload: {
          command: 'git',
          args: ['--version'],
          taskId: 'test-git'
        }
      })
      break
    case 2:
      console.log('\nTest 2: Run pnpm --version using built-in pnpm')
      worker.postMessage({
        type: 'execute',
        payload: {
          command: 'pnpm',
          args: ['--version'],
          taskId: 'test-pnpm'
        }
      })
      break
    case 3:
      console.log('\nTest 3: Run npm --version using built-in npm')
      worker.postMessage({
        type: 'execute',
        payload: {
          command: 'npm',
          args: ['--version'],
          taskId: 'test-npm'
        }
      })
      break
  }
}

runNextTest()
