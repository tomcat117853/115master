/**
 * 视频封面 Hook
 * @description 提供智能视频封面加载功能，支持滚动加载和缓存
 */
import type { Ref } from 'vue' // Vue 的 Ref 类型
import { useElementVisibility, useScroll } from '@vueuse/core' // VueUse 工具库，提供元素可见性和滚动检测
import { onUnmounted, reactive, watch } from 'vue' // Vue 核心 API
import { FRIENDLY_ERROR_MESSAGE } from '@/constants' // 友好错误信息
import { videoCoverCache } from '@/utils/cache' // 视频封面缓存
import { M3U8ClipperNew } from '@/utils/clipper/m3u8Clipper' // M3U8 视频剪辑器
import { drive115 } from '@/utils/drive115' // 115 网盘 API
import { Drive115Error } from '@/utils/drive115/core' // 115 网盘错误类型
import { getImageResize } from '@/utils/image' // 图片尺寸调整工具
import { Scheduler, SchedulerError, TaskStatus } from '@/utils/scheduler' // 任务调度器

/** 最大宽度：视频封面的最大宽度（像素） */
const MAX_WIDTH = 720

/** 最大高度：视频封面的最大高度（像素） */
const MAX_HEIGHT = 720

/**
 * 视频封面调度器
 * @description 限制并发加载数量，避免浏览器崩溃
 * @param maxConcurrent 最大并发数，设置为 3
 */
const videoCoverScheduler = new Scheduler<VideoCover[]>({
  maxConcurrent: 3, // 最多同时加载 3 个视频的封面
})

/**
 * 视频封面基础数据接口
 * @description 定义视频封面的基础属性
 */
interface VideoCoverBase {
  /** 宽度：封面图片宽度（像素） */
  width: number
  /** 高度：封面图片高度（像素） */
  height: number
  /** 帧实际时间（秒）：实际截图的视频时间点 */
  frameTime: number
  /** 跳转时间（秒）：请求截图的视频时间点 */
  seekTime: number
}

/**
 * 视频封面原始数据类型
 * @description 包含 blob 数据的视频封面，用于缓存
 */
export type VideoCoverRaw = VideoCoverBase & {
  /** 图片 blob：原始图片数据 */
  blob: Blob
}

/**
 * 视频封面数据类型
 * @description 用于显示的视频封面数据
 */
export type VideoCover = VideoCoverBase & {
  /** 图片 blob URL：用于 img 标签的 src 属性 */
  img: string
}

/**
 * 视频封面选项接口
 * @description 传递给 useSmartVideoCover 的选项
 */
export interface VideoCoverOptions {
  /** sha1：文件的 SHA1 值，用于缓存标识 */
  sha1: string
  /** 文件提取码：用于从 115 网盘获取视频信息 */
  pickCode: string
  /** 数量：需要生成的封面数量 */
  coverNum: number
  /** 持续时间：视频总时长（秒） */
  duration: number
}

/**
 * 智能加载配置接口
 * @description 控制智能加载的行为
 */
export interface SmartLoadConfig {
  /** 元素可见性检测的根元素：用于检测组件是否在视口中 */
  elementRef: Ref<HTMLElement | undefined>
  /** 额外的可见性条件（如父容器可见性）：可选的额外可见性检查 */
  additionalVisible?: Ref<boolean>
  /** 滚动容器：用于优化可见性检测和滚动防抖 */
  scrollTarget?: Ref<HTMLElement | undefined> | HTMLElement
  /** 可见性检测的阈值：元素进入视口多少比例时触发加载 */
  threshold?: number
  /** 根边距：扩展或缩小视口检测区域 */
  rootMargin?: string
}

/**
 * 生成任务ID
 * @description 根据视频信息生成唯一的任务ID，用于标识加载任务
 * @param options 视频封面选项
 * @returns 任务ID字符串
 */
function generateTaskId(options: VideoCoverOptions): string {
  return `cover_${options.sha1}_${options.pickCode}_${options.coverNum}_${options.duration}`
}

/**
 * 获取缓存键
 * @description 根据文件 SHA1 和时间点生成缓存键，用于缓存视频封面
 * @param sha1 文件的 SHA1 值
 * @param time 视频时间点（秒）
 * @returns 缓存键字符串
 */
const getCacheKey = (sha1: string, time: number): string => `${sha1}_${time}`

/**
 * 计算视频封面时间点
 * @description 根据视频时长和封面数量，计算出均匀分布的封面时间点
 * @param duration 视频时长（秒）
 * @param coverNum 封面数量
 * @returns 视频封面时间点数组（秒）
 */
function calculateVideoCoverTimes(duration: number, coverNum: number): number[] {
  /** 偏移量：跳过视频开头和结尾的部分，取中间最有代表性的内容 */
  const offset = duration / 10
  /** 获取最小时间：从偏移量开始，跳过视频开头 */
  const minTime = offset
  /** 获取最大时间：到总时长减去偏移量结束，跳过视频结尾 */
  const maxTime = duration - offset
  /** 范围：实际用于生成封面的时间范围 */
  const range = maxTime - minTime

  // 计算时间点：在有效范围内均匀生成 coverNum 个时间点
  return Array.from({ length: coverNum }, (_, i) =>
    Math.floor(minTime + (range / coverNum) * i))
}

/**
 * 将原始数据转换为可显示数据
 * @description 将包含 blob 的原始数据转换为包含 blob URL 的显示数据
 * @param rawData 原始视频封面数据
 * @returns 可显示的视频封面数据
 */
function toDisplayableData(rawData: VideoCoverRaw): VideoCover {
  return {
    img: URL.createObjectURL(rawData.blob), // 创建 blob URL 用于显示
    ...rawData, // 复制其他属性
  }
}

/**
 * 生成单个视频封面原始数据
 * @description 在指定时间点生成视频封面
 * @param clipper M3U8 剪辑器实例
 * @param time 视频时间点（秒）
 * @returns 原始视频封面数据
 */
async function generateVideoCoverRaw(clipper: M3U8ClipperNew, time: number): Promise<VideoCoverRaw> {
  let seekTime = time
  let result

  try {
    /** 获取截图：在指定时间点截取视频帧 */
    result = await clipper.seek(seekTime, true)
    if (!result) {
      throw new Error('no clipper result')
    }
  }
  catch (error) {
    if (error instanceof Error && error.message === '时间超出范围') {
      /** 使用安全的时间点：视频时长的一半 */
      seekTime = clipper.hlsIo.duration / 2
      result = await clipper.seek(seekTime, true)
      if (!result) {
        throw new Error('no clipper result')
      }
    }
    else {
      throw error
    }
  }

  /** 计算图片缩放尺寸：确保图片不超过最大宽度和高度 */
  const resize = getImageResize(
    result.videoFrame.displayWidth,
    result.videoFrame.displayHeight,
    MAX_WIDTH,
    MAX_HEIGHT,
  )

  /** 创建离屏画布：用于处理图片，不阻塞主线程 */
  const canvas = new OffscreenCanvas(resize.width, resize.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('no canvas context')
  }

  // 绘制视频帧到画布：调整尺寸并绘制
  ctx.drawImage(
    await createImageBitmap(result.videoFrame, {
      resizeQuality: 'pixelated', // 调整质量
      resizeWidth: resize.width, // 调整宽度
      resizeHeight: resize.height, // 调整高度
    }),
    0,
    0,
    resize.width,
    resize.height,
  )

  /** 将画布转换为 blob：生成图片数据 */
  const blob = await canvas.convertToBlob({
    type: 'image/webp', // 使用 WebP 格式，压缩率高
    quality: 0.85, // 图片质量
  })

  // 关闭视频帧：释放资源
  result.videoFrame.close()

  /** 构建原始数据对象 */
  const raw: VideoCoverRaw = {
    blob,
    width: resize.width,
    height: resize.height,
    frameTime: result.frameTime,
    seekTime, // 使用实际的 seekTime
  }
  return raw
}

/**
 * 从缓存获取视频封面
 * @description 尝试从缓存中获取所有需要的视频封面
 * @param sha1 文件的 SHA1 值
 * @param times 视频时间点数组
 * @returns 视频封面数组，如果缓存未命中则返回空数组
 */
async function getVideoCoversFromCache(sha1: string, times: number[]): Promise<VideoCover[]> {
  const covers: VideoCover[] = []
  for (const time of times) {
    const cacheKey = getCacheKey(sha1, time)
    const cache = await videoCoverCache.get(cacheKey)
    if (!cache) {
      return [] // 如果任何一个时间点的缓存未命中，就返回空数组
    }
    const cacheData = cache.value
    covers.push(toDisplayableData(cacheData))
  }
  return covers
}

/**
 * 获取视频封面
 * @description 从视频中生成指定时间点的封面
 * @param sha1 文件的 SHA1 值
 * @param pickCode 文件提取码
 * @param times 视频时间点数组
 * @returns 视频封面数组
 */
async function getVideoCover(sha1: string, pickCode: string, times: number[]): Promise<VideoCover[]> {
  /** 获取 m3u8 列表：从 115 网盘获取视频的播放列表 */
  const m3u8List = await drive115.getM3u8(pickCode)

  /** 获取源：选择质量最低的视频源，以加快截图速度 */
  const source = m3u8List.sort((a, b) => a.quality - b.quality)[0]
  if (!source) {
    throw new Error('source is null')
  }

  /** 创建 clipper：用于截取视频帧 */
  const clipper = new M3U8ClipperNew({
    url: source.url,
  })

  // 打开 clipper：初始化剪辑器
  await clipper.open()

  /** 生成每个时间点的视频封面 */
  const promises = times.map(async (time) => {
    const cacheKey = getCacheKey(sha1, time)
    /** 生成原始数据 */
    const raw = await generateVideoCoverRaw(clipper, time)
    videoCoverCache.set(cacheKey, raw) // 缓存原始数据
    return toDisplayableData(raw) // 转换为可显示数据
  })

  // 并行处理所有时间点，提高效率
  return Promise.all(promises)
}

/**
 * 清理 blob URL
 * @description 释放 blob URL 占用的资源，避免内存泄漏
 * @param covers blob URL 数组
 */
function cleanupBlobUrl(covers: string[]): void {
  covers.forEach((cover) => {
    if (cover.startsWith('blob:')) {
      URL.revokeObjectURL(cover) // 释放 blob URL
    }
  })
}

/**
 * 智能视频封面 Hook
 * @description 提供带滚动加载和缓存的视频封面功能
 * @param options 视频封面选项
 * @param config 智能加载配置
 * @returns 视频封面数据和状态
 */
export function useSmartVideoCover(options: Ref<VideoCoverOptions>, config: SmartLoadConfig) {
  /** 视频封面数据状态 */
  const videoCover = reactive<{
    isReady: boolean
    isLoading: boolean
    error: unknown
    state: VideoCover[]
  }>({
    isReady: false, // 是否准备就绪
    isLoading: false, // 是否正在加载
    error: undefined, // 错误信息
    state: [], // 视频封面数据数组
  })

  /** 任务ID：用于标识当前加载任务 */
  const taskId = generateTaskId(options.value)

  /** 计算视频封面时间点：根据视频时长和封面数量 */
  const times = calculateVideoCoverTimes(
    options.value.duration,
    options.value.coverNum,
  )

  /** 元素可见性：检测组件是否在视口中 */
  const visibility = useElementVisibility(config.elementRef, {
    threshold: config.threshold ?? 0, // 可见性阈值
    rootMargin: config.rootMargin ?? '0%', // 根边距
    scrollTarget: config.scrollTarget, // 滚动目标
  })

  /**
   * 添加任务到调度器
   * @param id 任务ID
   * @param sha1 文件的 SHA1 值
   * @param pickCode 文件提取码
   * @param times 视频时间点数组
   * @returns 视频封面数组
   */
  const addTask = (
    id: string,
    sha1: string,
    pickCode: string,
    times: number[],
  ) => {
    return videoCoverScheduler.add(
      () => {
        return getVideoCover(sha1, pickCode, times) // 执行视频封面获取
      },
      {
        id,
        immediate: true, // 立即执行
      },
    )
  }

  /**
   * 取消任务
   * @description 如果任务正在等待执行，则取消它，避免不必要的加载
   */
  const cancelTask = () => {
    const task = videoCoverScheduler.get(taskId)
    if (task && task.status === TaskStatus.Pending) {
      videoCoverScheduler.cancel(taskId)
    }
  }

  /**
   * 获取数据
   * @description 从视频中获取封面数据，添加到调度器执行
   * @param id 任务ID
   * @param options 视频封面选项
   */
  const getData = async (id: string, options: VideoCoverOptions) => {
    // 如果已经准备就绪或有错误，直接返回
    if (videoCover.isReady || videoCover.error) {
      return
    }

    /** 如果任务已经存在，直接返回 */
    const task = videoCoverScheduler.get(id)
    if (task) {
      return
    }

    // 开始加载
    videoCover.isLoading = true
    try {
      /** 添加任务到调度器并执行 */
      const data = await addTask(id, options.sha1, options.pickCode, times)
      videoCover.state = data // 更新状态
      videoCover.isReady = true // 标记为就绪
    }
    catch (error) {
      // 处理取消任务错误
      if (error instanceof SchedulerError.TaskCancelled) {
        return
      }
      // 处理 M3U8 文件未找到错误（视频未转码）
      if (error instanceof Drive115Error.NotFoundM3u8File) {
        videoCover.error = FRIENDLY_ERROR_MESSAGE.CANNOT_VIDEO_COVER_WITHOUT_TRANSCODING
        return
      }
      // 其他错误
      videoCover.error = error
    }
    finally {
      videoCover.isLoading = false // 结束加载
    }
  }

  /**
   * 从缓存获取数据
   * @description 尝试从缓存中获取封面数据，避免重复加载
   * @param options 视频封面选项
   */
  const getDataByCache = async (options: VideoCoverOptions) => {
    // 如果已经准备就绪或有错误，直接返回
    if (videoCover.isReady || videoCover.error) {
      return
    }

    // 开始加载
    videoCover.isLoading = true
    try {
      /** 尝试从缓存获取 */
      const data = await getVideoCoversFromCache(options.sha1, times)
      if (data.length > 0) {
        videoCover.state = data // 更新状态
        videoCover.isLoading = false // 结束加载
        videoCover.isReady = true // 标记为就绪
      }
    }
    catch (error) {
      videoCover.error = error // 处理错误
    }
    finally {
      videoCover.isLoading = false // 结束加载
    }
  }

  /** 滚动检测：用于优化加载时机，避免滚动时加载影响性能 */
  const { isScrolling } = useScroll(config.scrollTarget, {
    throttle: 1000 / 60, // 节流，每帧最多执行一次
    idle: 100, /** 滚动停止 100ms 后触发 onStop */
    onStop: async () => {
      // 滚动停止时，如果元素可见，则加载数据
      if (visibility.value) {
        await getDataByCache(options.value)
        getData(taskId, options.value)
      }
    },
  })

  /** 监听元素可见性变化：当元素进入视口时加载数据 */
  watch(visibility, async (value) => {
    if (value) {
      // 元素可见时加载数据
      if (isScrolling.value) {
        // 如果正在滚动，只尝试从缓存获取，避免影响滚动性能
        getDataByCache(options.value)
      }
      else {
        // 如果没有滚动，先尝试从缓存获取，再从视频获取
        await getDataByCache(options.value)
        getData(taskId, options.value)
      }
    }
    else {
      // 元素不可见时取消任务，避免不必要的加载
      cancelTask()
    }
  })

  /** 组件卸载时清理资源：避免内存泄漏 */
  onUnmounted(() => {
    // 从调度器中移除任务
    videoCoverScheduler.remove(taskId)
    // 清理 blob URL，释放资源
    cleanupBlobUrl(
      videoCover.state
        .map(item => item?.img)
        .filter(item => item !== undefined),
    )
  })

  // 返回视频封面数据和状态
  return {
    videoCover,
  }
}
