/**
 * 视频源数据处理模块
 * 负责获取和管理视频播放源
 */
import type { VideoSource } from '@/components/XPlayer'
import { ref } from 'vue'
import { VIDEO_SOURCE_EXTENSION } from '@/components/XPlayer/index.const'
import { qualityNumMap } from '@/constants/quality'
import { drive115 } from '@/utils/drive115'
import { getFileExtensionByUrl } from '@/utils/file'
import { appLogger } from '@/utils/logger'
import { setVideoCookie } from '..'

/** 日志 */
const logger = appLogger.sub('useDataVideoSources')

/**
 * 视频源数据管理
 * 提供视频源列表的获取、清空等功能
 */
export function useDataVideoSources() {
  /** 视频源列表 */
  const list = ref<VideoSource[]>([])

  /**
   * 获取视频源
   * @param pickCode - 文件选择码
   */
  const fetch = async (pickCode: string) => {
    // 并行获取下载链接和 m3u8 列表
    const [download, m3u8List] = await Promise.allSettled([
      drive115.getFileDownloadUrl(pickCode),
      drive115.getM3u8(pickCode),
    ])

    // 处理下载链接
    if (download.status === 'fulfilled') {
      // 设置认证 cookie
      if (download.value.url.auth_cookie) {
        logger.info('设置cookie', download.value.url.auth_cookie)
        try {
          await setVideoCookie({
            name: download.value.url.auth_cookie.name,
            value: download.value.url.auth_cookie.value,
            path: '/',
            domain: '.115cdn.net',
            secure: true,
            expirationDate: Number(download.value.url.auth_cookie.expire),
            sameSite: 'no_restriction',
          })
        }
        catch (error) {
          alert('设置cookie失败，请升级浏览器和油猴版本')
          throw error
        }
      }

      // 获取文件扩展名
      const extension
        = getFileExtensionByUrl(download.value.url.url)
          ?? VIDEO_SOURCE_EXTENSION.unknown

      // 添加 Ultra 质量的视频源
      list.value.unshift({
        name: 'Ultra',
        url: download.value.url.url,
        type: 'auto',
        extension,
        quality: 99999,
        displayQuality: 'Ultra',
      })
    }

    // 处理 m3u8 列表
    if (m3u8List.status === 'fulfilled') {
      list.value.push(
        ...m3u8List.value.map(item => ({
          name: `${item.quality}P`,
          url: item.url,
          type: 'hls' as const,
          extension: VIDEO_SOURCE_EXTENSION.m3u8,
          quality: item.quality,
          displayQuality:
            qualityNumMap[item.quality as keyof typeof qualityNumMap],
        })),
      )
    }
    else {
      logger.error('m3u8 获取失败:', m3u8List.reason)
    }
  }

  /**
   * 清空视频源列表
   */
  const clear = () => {
    list.value = []
  }

  return {
    list,      // 视频源列表
    fetch,     // 获取视频源的方法
    clear,     // 清空视频源的方法
  }
}
