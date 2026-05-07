/**
 * 文件列表修改模块
 * 负责处理115网盘文件列表的各种增强功能
 */
import { unsafeWindow } from '$'
import { BaseMod } from '@/pages/home/BaseMod'
import { FileListType } from '@/pages/home/types'
import { appLogger } from '@/utils/logger'
import { isReload } from '@/utils/route'
import { FileItemModLoader } from './FileItemLoader'
import { FileItemModActressInfo } from './FileItemMod/actressInfo'
import { FileItemModClickPlay } from './FileItemMod/clickPlay'
import { FileItemModDownload } from './FileItemMod/download'
import { FileItemModExtInfo } from './FileItemMod/extInfo'
import { FileItemModExtMenu } from './FileItemMod/extMenu'
import { FileItemModFolderLink } from './FileItemMod/folderLink'
import { FileItemModVideoCover } from './FileItemMod/videoCover'
import { FileListScrollHistory } from './scrollHistory'
import './index.css'

/**
 * 文件项修改器列表
 * 按顺序应用到每个文件项上
 */
const itemMods = [
  FileItemModFolderLink, // 文件夹链接修改器
  FileItemModExtInfo, // 扩展信息修改器
  FileItemModActressInfo, // 演员信息修改器
  FileItemModVideoCover, // 视频封面修改器
  FileItemModExtMenu, // 扩展菜单修改器
  FileItemModClickPlay, // 点击播放修改器
  FileItemModDownload, // 下载功能修改器
]

/**
 * 文件列表修改器
 * 负责管理文件列表的变化监听、文件项的修改和滚动历史记录
 */
class FileListMod extends BaseMod {
  /** 日志 */
  protected logger = appLogger.sub('FileListMod')
  /** 文件列表 Item Mod Loader Map */
  private itemModLoaderMaps: Map<HTMLLIElement, FileItemModLoader> = new Map()
  /** 文件列表变化监听器 */
  private observerContent: MutationObserver | null = null
  /** 文件列表滚动位置记录 */
  private scrollHistory: FileListScrollHistory | null = null

  /**
   * 构造函数
   */
  constructor() {
    super()
    this.init()
  }

  /**
   * 获取文件列表容器节点
   */
  get dataListBoxNode() {
    return document.querySelector<HTMLElement>(
      unsafeWindow.Main.CONFIG.DataListBox,
    )
  }

  /**
   * 获取文件列表DOM容器
   */
  get listCellNode() {
    return document.querySelector<HTMLElement>('.list-cell') ?? null
  }

  /**
   * 获取文件列表内容节点（列表视图）
   */
  get listContentsNode() {
    return this.listCellNode?.querySelector<HTMLElement>('.list-contents')
  }

  /**
   * 获取文件列表缩略图节点（网格视图）
   */
  get listThumbNode() {
    return this.listCellNode?.querySelector<HTMLElement>('.list-thumb')
  }

  /**
   * 获取文件列表滚动容器节点
   */
  get listScrollBoxNode() {
    return this.listContentsNode ?? this.listThumbNode
  }

  /**
   * 获取文件列表类型
   */
  get listType(): FileListType {
    if (this.listContentsNode) {
      return FileListType.list // 列表视图
    }
    return FileListType.grid // 网格视图
  }

  /**
   * 获取文件列表 Item Nodes
   */
  get itemNodes() {
    return this.listCellNode?.querySelectorAll('li')
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.observerContent?.disconnect()
    this.destroyAllItemModLoader()
    this.scrollHistory?.destroy()
  }

  /**
   * 初始化
   */
  private async init() {
    this.updateItems()
    this.scrollHistory = new FileListScrollHistory()
    isReload() && this.scrollHistory.clearAll()
    if (this.listScrollBoxNode) {
      this.scrollHistory?.setScrollBox(this.listScrollBoxNode)
    }
    this.watchItemsChange()
  }

  /**
   * 监听文件列表 Item 变化
   */
  private watchItemsChange() {
    let observerContent: MutationObserver | null = null
    observerContent = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // 如果目标节点是文件列表dom，并且有新增节点，则更新文件列表
        if (
          mutation.target.isSameNode(this.dataListBoxNode)
          && mutation.addedNodes.length > 0
        ) {
          this.updateItems()
          this.listScrollBoxNode
          && this.scrollHistory?.setScrollBox(this.listScrollBoxNode)
          break
        }
      }
    })

    if (!this.dataListBoxNode) {
      this.logger.error('文件列表容器节点不存在, 无法监听文件列表变化')
      return
    }

    observerContent.observe(this.dataListBoxNode!, {
      childList: true,
    })
    this.observerContent = observerContent
  }

  /**
   * 更新文件列表
   */
  private updateItems() {
    const itemNodes = this.itemNodes
    const itemsSet = new Set(itemNodes)

    if (!itemsSet) {
      return
    }

    // 创建新 Item 修改器
    for (const item of itemsSet) {
      // 如果已经存在，则跳过
      if (this.itemModLoaderMaps.has(item)) {
        continue
      }
      const itemModLoader = new FileItemModLoader(
        item,
        this.listType,
        this.listScrollBoxNode!,
        itemMods,
      )
      itemModLoader.load()
      this.itemModLoaderMaps.set(item, itemModLoader)
    }

    // 销毁旧 Item 修改器
    for (const [key, value] of this.itemModLoaderMaps.entries()) {
      // 如果 li Node 存在，则跳过
      if (itemsSet.has(key)) {
        continue
      }
      // 销毁文件列表item
      value.destroy()
      // 删除文件列表item
      this.itemModLoaderMaps.delete(key)
    }
  }

  /**
   * 销毁所有 Item Mod Loader
   */
  private destroyAllItemModLoader(): void {
    this.itemModLoaderMaps.forEach((item) => {
      item.destroy()
    })
    this.itemModLoaderMaps.clear()
  }
}

export default FileListMod
