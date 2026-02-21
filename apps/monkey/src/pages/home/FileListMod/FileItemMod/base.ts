/**
 * 文件列表项目修改器基类
 * 定义了所有文件项目修改器的基础结构和通用方法
 */
import type { ItemInfo } from '@/pages/home/types'
import type { UserSettings } from '@/utils/userSettings'
import { userSettings } from '@/utils/userSettings'

/**
 * 文件列表 Item 修改器基类
 * 所有具体的文件项目修改器都继承自这个类
 */
export abstract class FileItemModBase {
  /** 是否 Plus 功能 */
  readonly IS_PLUS: boolean = false
  /** 在用户设置中的使能字段 */
  readonly ENABLE_KEY_IN_USER_SETTING: keyof UserSettings['value'] | undefined
    = undefined

  /**
   * 构造函数
   * @param itemNode - 文件项 DOM 节点
   * @param itemInfo - 文件项信息
   */
  constructor(
    readonly itemNode: HTMLElement,
    readonly itemInfo: ItemInfo,
  ) {}

  /**
   * 加载修改器
   * 根据用户设置决定是否启用
   */
  load() {
    if (this.ENABLE_KEY_IN_USER_SETTING) {
      if (userSettings.value[this.ENABLE_KEY_IN_USER_SETTING]) {
        this.onLoad()
      }
      userSettings.watch(this.ENABLE_KEY_IN_USER_SETTING, (_, newValue) => {
        if (newValue) {
          this.onLoad()
        }
        else {
          this.destroy()
        }
      })
    }
    else {
      this.onLoad()
    }
  }

  /**
   * 销毁修改器
   */
  destroy() {
    this.onDestroy()
  }
  
  /**
   * 加载时执行的抽象方法
   * 子类必须实现
   */
  abstract onLoad(): void
  
  /**
   * 销毁时执行的抽象方法
   * 子类必须实现
   */
  abstract onDestroy(): void
}

/**
 * 文件列表 Item 修改器类型
 * 定义了修改器构造函数的类型
 */
export type FileListMod = new (
  itemNode: HTMLElement,
  itemInfo: ItemInfo,
) => FileItemModBase
