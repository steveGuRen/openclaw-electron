class Mutex {
  /**
   * 创建互斥锁实例
   * @param {number} defaultTimeout - 默认超时时间（毫秒），默认5分钟
   */
  constructor(defaultTimeout = 5 * 60 * 1000) {
    this.locked = false
    this.queue = []
    this.defaultTimeout = defaultTimeout
    this.timeoutId = null
    this.currentLockOwner = null
  }

  /**
   * 尝试获取锁，立即返回结果
   * @returns {boolean} 是否获取成功
   */
  tryLock() {
    if (this.locked) return false
    this.locked = true
    this._setAutoRelease()
    return true
  }

  /**
   * 获取锁，支持超时等待
   * @param {number} timeout - 超时时间（毫秒），使用默认值则传0
   * @returns {Promise<boolean>} 是否获取成功
   */
  async lock(timeout = 0) {
    const actualTimeout = timeout > 0 ? timeout : this.defaultTimeout

    // 如果锁未被占用，直接获取
    if (!this.locked) {
      this.locked = true
      this._setAutoRelease()
      return true
    }

    // 否则加入等待队列
    return new Promise((resolve) => {
      const waitTimeoutId = setTimeout(() => {
        // 从队列中移除
        const index = this.queue.findIndex(item => item.resolve === resolve)
        if (index !== -1) {
          this.queue.splice(index, 1)
          resolve(false)
        }
      }, actualTimeout)

      this.queue.push({
        resolve,
        waitTimeoutId
      })
    })
  }

  /**
   * 释放锁
   */
  unlock() {
    if (!this.locked) return

    // 清除自动释放定时器
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }

    this.locked = false
    this.currentLockOwner = null

    // 处理队列中的下一个等待者
    if (this.queue.length > 0) {
      const next = this.queue.shift()
      clearTimeout(next.waitTimeoutId)

      this.locked = true
      this._setAutoRelease()
      next.resolve(true)
    }
  }

  /**
   * 检查锁是否被占用
   * @returns {boolean} 锁是否被占用
   */
  isLocked() {
    return this.locked
  }

  /**
   * 设置自动释放锁
   */
  _setAutoRelease() {
    // 清除之前的定时器
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }

    // 设置新的自动释放定时器
    this.timeoutId = setTimeout(() => {
      console.warn('Mutex自动释放：锁超时，可能存在死锁')
      this.unlock()
    }, this.defaultTimeout)
  }

  /**
   * 强制释放锁，用于异常恢复
   */
  forceUnlock() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }

    // 清除所有等待者
    this.queue.forEach(item => {
      clearTimeout(item.waitTimeoutId)
      item.resolve(false)
    })
    this.queue = []

    this.locked = false
    this.currentLockOwner = null
  }

  /**
   * 使用锁执行异步函数，自动处理获取和释放
   * @param {Function} fn - 要执行的异步函数
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<any>} 函数执行结果
   */
  async withLock(fn, timeout = 0) {
    const locked = await this.lock(timeout)
    if (!locked) {
      throw new Error('获取锁超时')
    }

    try {
      return await fn()
    } finally {
      this.unlock()
    }
  }
}

export default Mutex
