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
    // 直接获取正确的列表容器
    const listContainer = document.querySelector('.list-contents') || document.querySelector('.list-thumb')
    if (!listContainer) return

    // 获取所有文件项
    const allItems = Array.from(listContainer.querySelectorAll('li'))
    
    // 过滤出视频文件
    const videoItems = allItems.filter(item => {
      return item.getAttribute('iv') === '1'
    })

    if (videoItems.length === 0) return

    // 找到排序按钮
    const sortButton = document.querySelector('.master-time-sort-btn')
    if (!sortButton) return

    const isSorted = sortButton.classList.contains('active')

    if (isSorted) {
      // 已经排序，取消排序（恢复原始顺序）
      // 不使用 location.reload()，而是重新获取并恢复原始顺序
      this.restoreOriginalOrder(listContainer, allItems)
    } else {
      // 未排序，按时长从小到大排序
      // 先解析所有视频的时长
      const videosWithDuration = videoItems.map(item => {
        const fileName = item.querySelector('.name')?.textContent?.trim() || 'unknown'
        
        // 尝试多种方式获取时长信息
        let durationText = '0:00'
        let duration = 0
        
        // 方式1：查找 .duration 元素（用户提供的位置）
        const durationNode = item.querySelector('.duration')
        if (durationNode) {
          // 优先从 duration 属性获取
          const durationAttr = durationNode.getAttribute('duration')
          if (durationAttr) {
            durationText = durationAttr
            console.log(`找到 duration 属性: ${durationAttr}`)
          } else {
            // 其次从文本内容获取
            durationText = durationNode.textContent?.trim() || '0:00'
            console.log(`找到 .duration 元素文本: ${durationText}`)
          }
        }
        
        // 解析时长为秒数
        if (durationText !== '0:00') {
          const parseDuration = (timeStr: string): number => {
            const parts = timeStr.split(':').map(Number)
            let seconds = 0
            
            if (parts.length === 3) {
              // HH:MM:SS
              seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
            } else if (parts.length === 2) {
              // MM:SS
              seconds = parts[0] * 60 + parts[1]
            }
            
            return seconds
          }
          
          duration = parseDuration(durationText)
        }
        
        console.log(`文件 ${fileName} 时长: ${durationText} (${duration} 秒)`)
        
        return {
          item,
          fileName,
          duration,
          originalText: durationText // 保存原始文本用于调试
        }
      })
      
      // 生成日志
      const logData = {
        timestamp: new Date().toISOString(),
        beforeSort: videosWithDuration.map(v => ({
          fileName: v.fileName,
          originalText: v.originalText,
          duration: v.duration
        })),
        afterSort: []
      }
      
      // 按时长排序
      videosWithDuration.sort((a, b) => a.duration - b.duration)
      
      // 记录排序后的结果
      logData.afterSort = videosWithDuration.map(v => ({
        fileName: v.fileName,
        originalText: v.originalText,
        duration: v.duration
      }))
      
      // 输出日志到控制台
      console.log('=== 视频排序日志 ===', logData)
      
      // 提取排序后的视频项
      const sortedVideos = videosWithDuration.map(v => v.item)
      
      // 过滤出非视频文件
      const nonVideoItems = allItems.filter(item => {
        return item.getAttribute('iv') !== '1'
      })

      // 先清空容器
      while (listContainer.firstChild) {
        listContainer.removeChild(listContainer.firstChild)
      }

      // 先添加非视频文件，再添加排序后的视频文件
      nonVideoItems.forEach(item => listContainer.appendChild(item))
      sortedVideos.forEach(item => listContainer.appendChild(item))
    }
  }

  /** 恢复原始顺序 */
  private restoreOriginalOrder(listContainer: Element, originalItems: Element[]) {
    // 先清空容器
    while (listContainer.firstChild) {
      listContainer.removeChild(listContainer.firstChild)
    }
    
    // 按照原始顺序添加回去
    originalItems.forEach(item => listContainer.appendChild(item))
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
