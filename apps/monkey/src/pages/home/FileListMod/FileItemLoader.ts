/**
 * 文件列表项目修改加载器
 * 负责加载和管理单个文件项目的各种修改器
 */
import type { FileItemModBase, FileListMod } from './FileItemMod/base'
import type { FileItemAttributes, FileListType, ItemInfo } from '@/pages/home/types'
import { PLUS_VERSION } from '@/constants'
import { getAvNumber } from '@/utils/getNumber'
import { getDuration } from '@/utils/time'

/**
 * 文件列表 Item 修改加载器
 * 负责为单个文件项加载和管理多个修改器
 */
export class FileItemModLoader {
  /** 已加载的修改器 */
  private loadedMods: FileItemModBase[] = []

  /**
   * 构造函数
   * @param itemNode - 文件项节点 DOM
   * @param fileListType - 文件列表类型
   * @param listScrollBoxNode - 列表滚动容器 DOM
   * @param mods - 要加载的修改器类数组
   */
  constructor(
    /** item 节点 DOM */
    private readonly itemNode: HTMLElement,
    /** 文件列表类型 */
    private readonly fileListType: FileListType,
    /** 列表滚动容器 DOM */
    private readonly listScrollBoxNode: HTMLElement,
    /** 加载的 item 修改器类 */
    private readonly mods: Array<FileListMod>,
  ) {}

  /**
   * 获取文件项属性
   */
  private get attributes(): FileItemAttributes {
    return Object.fromEntries(
      Array.from(this.itemNode.attributes).map(attr => [
        attr.name,
        attr.value,
      ]),
    ) as unknown as FileItemAttributes
  }

  /**
   * 获取番号
   */
  private get avNumber(): ItemInfo['avNumber'] {
    return getAvNumber(this.attributes.title)
  }

  /**
   * 获取视频时长节点
   */
  private get durationNode(): HTMLElement | null {
    return this.itemNode.querySelector('.duration') ?? null
  }

  /**
   * 获取视频时长
   */
  private get duration(): number {
    return getDuration(this.durationNode?.getAttribute('duration') ?? '')
  }

  /**
   * 获取文件项信息
   */
  private get itemInfo(): ItemInfo {
    return {
      avNumber: this.avNumber,
      attributes: this.attributes,
      fileListType: this.fileListType,
      duration: this.duration,
      listScrollBoxNode: this.listScrollBoxNode,
    }
  }

  /**
   * 加载修改器
   */
  async load() {
    this.mods.forEach((Mod) => {
      const mod = new Mod(this.itemNode, this.itemInfo)
      // 如果 mod 是 Plus 功能，并且没有 PLUS_VERSION，则不加载
      if (mod.IS_PLUS && !PLUS_VERSION) {
        return
      }
      mod.load()
      this.loadedMods.push(mod)
    })
  }

  /**
   * 销毁所有修改器
   */
  destroy() {
    this.loadedMods.forEach((mod) => {
      mod.destroy()
    })
  }
}
