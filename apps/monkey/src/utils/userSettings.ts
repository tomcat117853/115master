/**
 * 用户设置管理模块
 * 负责管理和持久化用户设置
 */
import { GM_getValue, GM_setValue } from '$'

/**
 * 用户设置接口
 * 定义所有可配置的用户设置项
 */
export interface Settings {
  /** 启动文件列表预览 */
  enableFilelistPreview: boolean
}

/**
 * 默认设置
 * 当用户未设置时使用的默认值
 */
const DEFAULT_SETTINGS: Settings = {
  enableFilelistPreview: true,
}

/**
 * 监听任务接口
 * @template K - 设置键名类型
 */
interface WatchTask<K extends keyof Settings> {
  key: K
  callback: (oldValue: Settings[K], newValue: Settings[K]) => void
}

/**
 * 任意监听任务
 */
type AnyWatchTask = WatchTask<keyof Settings>

/**
 * 用户设置管理类
 * 提供设置的获取、修改和监听功能
 */
export class UserSettings {
  /** 设置值对象 */
  value: Settings
  /** 监听任务列表 */
  private watchTasks: AnyWatchTask[] = []

  /**
   * 构造函数
   */
  constructor() {
    this.value = this.create()
  }

  /**
   * 监听设置变化
   * @template K - 设置键名类型
   * @param key - 要监听的设置键
   * @param callback - 变化时的回调函数
   * @returns () => void - 取消监听的函数
   */
  watch<K extends keyof Settings>(
    key: K,
    callback: (oldValue: Settings[K], newValue: Settings[K]) => void,
  ) {
    const watchTask = {
      key,
      callback,
    }
    this.watchTasks.push(watchTask)

    /**
     * 取消监听的函数
     */
    return () => {
      const index = this.watchTasks.indexOf(watchTask)
      if (index > -1) {
        this.watchTasks.splice(index, 1)
      }
    }
  }

  /**
   * 创建用户设置对象
   * @returns Settings - 包装后的设置对象
   */
  private create() {
    const namespace = 'USER_SETTINGS'
    /** 从 GM 存储获取设置，默认为空对象 */
    const value = GM_getValue(namespace) ?? {}
    /** 合并默认设置和用户设置 */
    const userSettings = { ...DEFAULT_SETTINGS, ...value }

    /** 创建代理对象，用于监听设置变化 */
    const proxy = new Proxy(userSettings, {
      /**
       * 获取设置值
       * @param target - 目标对象
       * @param key - 属性键
       * @returns any - 设置值
       */
      get: (target, key) => {
        return target[key]
      },

      /**
       * 设置设置值
       * @param target - 目标对象
       * @param key - 属性键
       * @param newValue - 新值
       * @returns boolean - 设置是否成功
       */
      set: (target, key, newValue) => {
        const oldValue = target[key]
        target[key] = newValue
        // 持久化到 GM 存储
        GM_setValue(namespace, target)
        // 触发相关的 watch 回调
        this.watchTasks.forEach((task) => {
          if (task.key === key) {
            task.callback(oldValue, newValue)
          }
        })

        return true
      },
    })

    return proxy
  }
}

/**
 * 用户设置实例
 * 全局唯一的用户设置管理器
 */
export const userSettings = new UserSettings()
