import type { TopRootSearchParams } from '@/pages/home/global'
import { unsafeWindow } from '$'
import { BaseMod } from '@/pages/home/BaseMod'
import { getUrlParams } from '@/utils/url'
import { userSettings } from '@/utils/userSettings'
import { openOfflineTask } from './openOfflineTask'
import './index.css'
import 'iconify-icon'

/**
 * 顶部导航栏修改器
 * @description
 * 1. 添加自定义的云下载一级按钮
 * 2. 删除官方的云下载按钮
 * 3. 云下载按钮免除刷新重定向
 * 4. 添加预览切换开关
 */
export class TopHeaderMod extends BaseMod {
  constructor() {
    super()
    this.init()
  }

  /** 顶部导航栏节点 */
  get topHeaderNode() {
    return document.querySelector(unsafeWindow.Main.CONFIG.TopPanelBox)
      ?.firstElementChild as HTMLElement
  }

  /** 销毁 */
  destroy() {}

  /** 初始化 */
  private init() {
    if (!this.topHeaderNode)
      return
    const params = getUrlParams<TopRootSearchParams>(
      top?.window.location.search ?? '',
    )
    if (params.mode === 'search') {
      return
    }
    this.deleteOfficialDownloadButton()
    this.addMasterOfflineTaskButton()
    this.addPreviewSwitchButton()
    this.addTimeSortButton()
    this.fixContextMenuPosition('upload_btn_add_dir')
    this.fixContextMenuPosition('create_new_add_dir')
  }

  /** 删除官方的离线任务按钮 */
  private deleteOfficialDownloadButton() {
    const downloadButton = this.topHeaderNode?.querySelector(
      '.button[menu=\'offline_task\']',
    )
    if (downloadButton) {
      downloadButton.remove()
    }
  }

  /** 添加 Master 离线任务按钮 */
  private addMasterOfflineTaskButton() {
    const button = this.createMasterOfflineTaskButton()
    this.topHeaderNode?.prepend(button)
  }

  /** 创建 Master 离线任务按钮 */
  private createMasterOfflineTaskButton() {
    const button = document.createElement('a')
    button.classList.add('button', 'master-offline-task-btn')
    button.href = 'javascript:void(0)'
    button.innerHTML = `
            <i class="icon-operate ifo-linktask"></i>
            <span>云下载</span>
        `
    button.style.background = '#3a4783'
    button.style.borderColor = '#3a4783'
    button.onclick = () => {
      openOfflineTask()
    }
    return button
  }

  /** 添加预览切换开关 */
  private addPreviewSwitchButton() {
    const button = this.createPreviewSwitchButton()
    this.topHeaderNode?.append(button)
  }

  /** 创建预览切换开关 */
  private createPreviewSwitchButton() {
    const value = userSettings.value.enableFilelistPreview
    const button = document.createElement('a')
    button.classList.add('button', 'btn-line', 'master-preview-switch-btn')
    if (value) {
      button.classList.add('active')
    }
    button.setAttribute('title', '开启文件预览')
    button.href = 'javascript:void(0)'
    button.innerHTML = `
      <iconify-icon class="preview-off" icon="material-symbols:preview-off" noobserver></iconify-icon>
      <iconify-icon class="preview-on" icon="material-symbols:preview" noobserver></iconify-icon>
    `
    button.onclick = () => {
      userSettings.value.enableFilelistPreview
        = !userSettings.value.enableFilelistPreview
      button.classList.toggle('active')
    }
    return button
  }

  /** 添加时间排序按钮 */
  private addTimeSortButton() {
    const button = this.createTimeSortButton()
    this.topHeaderNode?.append(button)
  }

  /** 创建时间排序按钮 */
  private createTimeSortButton() {
    const button = document.createElement('a')
    button.classList.add('button', 'btn-line', 'master-time-sort-btn')
    button.setAttribute('title', '按视频时长排序')
    button.href = 'javascript:void(0)'
    // 只保留图标，确保没有文字
    button.innerHTML = '<i class="icon-operate ifo-sort"></i>'
    button.onclick = () => {
      this.toggleTimeSort()
      button.classList.toggle('active')
    }
    return button
  }

  /** 切换时间排序 */
  private toggleTimeSort() {
    const listCellNode = document.querySelector('.list-contents') || document.querySelector('.list-thumb')
    if (!listCellNode) return

    const itemNodes = Array.from(listCellNode.querySelectorAll('li'))
    const videoItems = itemNodes.filter(item => {
      const iv = item.getAttribute('iv')
      return iv === '1' // 只处理视频文件
    })

    if (videoItems.length === 0) return

    // 找到排序按钮
    const sortButton = document.querySelector('.master-time-sort-btn')
    if (!sortButton) return

    const isSorted = sortButton.classList.contains('active')

    if (isSorted) {
      // 已经排序，取消排序（恢复原始顺序）
      // 重新加载文件列表
      location.reload()
    } else {
      // 未排序，按时长从小到大排序
      const sortedItems = [...videoItems].sort((a, b) => {
        // 获取时长元素
        const durationANode = a.querySelector('.duration')
        const durationBNode = b.querySelector('.duration')
        
        // 获取时长文本
        const durationAText = durationANode?.textContent?.trim() || '0:00'
        const durationBText = durationBNode?.textContent?.trim() || '0:00'
        
        // 解析时长为秒数
        const parseDuration = (timeStr: string): number => {
          const parts = timeStr.split(':').map(Number).reverse()
          let seconds = 0
          if (parts.length >= 1) seconds += parts[0] // 秒
          if (parts.length >= 2) seconds += parts[1] * 60 // 分
          if (parts.length >= 3) seconds += parts[2] * 3600 // 时
          return seconds
        }
        
        const secondsA = parseDuration(durationAText)
        const secondsB = parseDuration(durationBText)
        
        return secondsA - secondsB
      })

      // 保存非视频文件的原始顺序
      const nonVideoItems = itemNodes.filter(item => {
        const iv = item.getAttribute('iv')
        return iv !== '1'
      })

      // 先清空容器
      while (listCellNode.firstChild) {
        listCellNode.removeChild(listCellNode.firstChild)
      }

      // 先添加非视频文件，再添加排序后的视频文件
      nonVideoItems.forEach(item => {
        listCellNode.appendChild(item)
      })
      sortedItems.forEach(item => {
        listCellNode.appendChild(item)
      })
    }
  }

  /** 修正右键菜单位置 */
  private fixContextMenuPosition(name: string) {
    const tabNode = document.querySelector<HTMLElement>(
      `[data-dropdown-tab="${name}"]`,
    )
    const contextMenuNode = document.querySelector<HTMLElement>(
      `[data-dropdown-content="${name}"]`,
    )
    if (!tabNode || !contextMenuNode)
      return
    const tabRect = tabNode.getBoundingClientRect()
    contextMenuNode.style.left = `${tabRect.left}px`
  }
}
