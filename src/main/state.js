import Store from 'electron-store'
import keytar from 'keytar'

const store = new Store({
  name: 'dclaw-config',
  encryptionKey: 'dclaw-secure-storage'
})

class AppState {
  constructor() {
    this.store = store
  }

  // 普通配置存储
  get(key, defaultValue = null) {
    return this.store.get(key, defaultValue)
  }

  set(key, value) {
    return this.store.set(key, value)
  }

  // 敏感信息存储（使用系统密钥链）
  async getSecure(key) {
    try {
      return await keytar.getPassword('dclaw', key)
    } catch (e) {
      console.error('Failed to get secure data:', e)
      return null
    }
  }

  async setSecure(key, value) {
    try {
      await keytar.setPassword('dclaw', key, value)
      return true
    } catch (e) {
      console.error('Failed to set secure data:', e)
      return false
    }
  }

  async deleteSecure(key) {
    try {
      await keytar.deletePassword('dclaw', key)
      return true
    } catch (e) {
      console.error('Failed to delete secure data:', e)
      return false
    }
  }
}

export default new AppState()
