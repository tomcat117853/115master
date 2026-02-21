<template>
  <!-- 视频封面容器组件 -->
  <div ref="rootRef" :class="styles.container.main">
    <div :class="styles.container.content">
      <!-- 错误状态：当视频封面加载失败时显示错误信息 -->
      <div v-if="videoCover.error" :class="styles.states.error">
        <LoadingError size="mini" :message="videoCover.error" />
      </div>

      <!-- 骨架屏：当视频封面正在加载时显示加载状态 -->
      <template v-else-if="videoCover.isLoading">
        <div :class="styles.skeleton" />
      </template>

      <!-- 内容：当视频封面加载完成后显示缩略图 -->
      <div
        v-else-if="videoCover.isReady"
        :id="`gallery-${props.pickCode}`"
        class="pswp-gallery"  <!-- PhotoSwipe 图库类名 -->
        :class="styles.cover.container"
      >
        <!-- 循环渲染每个视频缩略图 -->
        <a
          v-for="(thumbnail, index) in videoCover.state"
          :key="index"
          :class="[styles.cover.thumbItem]"
          @click.prevent.stop="openPhotoSwipe(index)"  <!-- 点击缩略图打开 PhotoSwipe 查看器 -->
        >
          <img
            :src="thumbnail.img"  <!-- 缩略图图片地址 -->
            :alt="`视频封面 ${index + 1}`"  <!-- 图片描述 -->
            :class="styles.cover.thumbImage"
          >
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 导入必要的依赖
import PhotoSwipeLightbox from 'photoswipe/lightbox'  // 图片查看器库
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'  // Vue 核心 API
import LoadingError from '@/components/LoadingError/index.vue'  // 错误提示组件
import { useSmartVideoCover } from '@/hooks/useVideoCover'  // 视频封面智能加载 hook
import { clsx } from '@/utils/clsx'  // 样式类名工具
import 'photoswipe/style.css'  // PhotoSwipe 样式

// 组件属性定义
const props = defineProps<{
  pickCode: string  // 文件提取码，用于获取视频信息
  sha1: string  // 文件的 SHA1 值，用于缓存标识
  duration: number | string  // 视频时长，用于计算缩略图时间点
  listScrollBoxNode: HTMLElement  // 滚动容器节点，用于智能加载
}>()

/** 文件列表视频封面数量 */
const FILELIST_VIDEO_COVER_NUM = 10

/** 样式常量定义 */
const styles = clsx({
  // 容器样式
  container: {
    main: 'h-24 w-full max-w-428 px-20 [content-visibility:auto]',  // 主容器：高度 24，宽度自适应，最大宽度 428
    content:
      'bg-base-300 relative flex h-full items-center overflow-hidden rounded',  // 内容容器：背景色，相对定位，弹性布局
  },
  // 状态样式
  states: {
    error: 'flex flex-1 items-center justify-center',  // 错误状态：弹性布局，居中显示
  },
  // 骨架样式
  skeleton: 'skeleton h-full w-full rounded',  // 骨架屏：占满容器
  // 视频封面
  cover: {
    container: [
      'flex h-full w-full overflow-hidden select-none',  // 封面容器：弹性布局，占满容器，隐藏溢出，禁止选择
    ],
    thumbItem: [
      'aspect-video h-full',  // 缩略图项：保持视频宽高比，高度占满
      'overflow-hidden',  // 隐藏溢出
      'cursor-zoom-in no-underline',  // 鼠标指针变为放大镜，无下划线
      'transition-opacity hover:opacity-90',  // 悬停时透明度变化
    ],
    thumbImage: ['h-full w-full object-contain object-center align-top'],  // 缩略图图片：占满容器，保持比例，居中显示
  },
})

/** 根元素引用，用于元素可见性检测 */
const rootRef = ref<HTMLElement>()

/** PhotoSwipe 实例，用于图片查看器 */
const lightbox = ref<PhotoSwipeLightbox | null>(null)

/** 滚动目标 ref（用于 useScroll），从 props 中获取 */
const scrollTargetRef = computed(() => props.listScrollBoxNode)

/** 选项配置，传递给 useSmartVideoCover hook */
const options = computed(() => ({
  sha1: props.sha1,  // 文件的 SHA1 值
  pickCode: props.pickCode,  // 文件提取码
  coverNum: FILELIST_VIDEO_COVER_NUM,  // 封面数量
  duration: Number(props.duration),  // 视频时长（转换为数字）
}))

/** 配置对象，传递给 useSmartVideoCover hook */
const config = {
  elementRef: rootRef,  // 元素引用，用于可见性检测
  scrollTarget: scrollTargetRef,  // 滚动目标，用于智能加载
}

/** 调用 useSmartVideoCover hook 获取视频封面数据 */
const { videoCover } = useSmartVideoCover(options, config)

/**
 * 初始化 PhotoSwipe 图片查看器
 * 当视频封面加载完成后调用
 */
function initPhotoSwipe() {
  // 如果已经初始化过，先销毁实例
  if (lightbox.value) {
    lightbox.value.destroy()
    lightbox.value = null
  }

  // 创建新的 PhotoSwipeLightbox 实例
  lightbox.value = new PhotoSwipeLightbox({
    // 数据源：从 videoCover.state 中获取图片信息
    dataSource: videoCover.state.map(item => ({
      src: item.img,  // 图片地址
      width: item.width,  // 图片宽度
      height: item.height,  // 图片高度
      alt: '视频封面',  // 图片描述
    })),
    showHideAnimationType: 'fade',  // 显示/隐藏动画类型：淡入淡出
    pswpModule: () => import('photoswipe'),  // 动态导入 PhotoSwipe 核心模块
    mouseMovePan: true,  // 允许鼠标拖动平移
    initialZoomLevel: 'fit',  // 初始缩放级别：适应屏幕
    secondaryZoomLevel: 2,  // 二级缩放级别：2 倍
    maxZoomLevel: 4,  // 最大缩放级别：4 倍
    wheelToZoom: true,  // 允许鼠标滚轮缩放
    bgOpacity: 0.9,  // 背景透明度：0.9
  })

  // 初始化 PhotoSwipe
  lightbox.value.init()
}

/**
 * 打开 PhotoSwipe 图片查看器
 * @param index 要查看的图片索引
 */
function openPhotoSwipe(index: number) {
  // 如果 lightbox 未初始化或视频封面未准备好，直接返回
  if (!lightbox.value || !videoCover.isReady)
    return
  
  // 加载并打开指定索引的图片
  lightbox.value.loadAndOpen(index)
}

// 监听视频封面是否准备好，当准备好时初始化 PhotoSwipe
watch(
  () => videoCover.isReady,
  async (isReady) => {
    if (isReady) {
      // 等待下一个 DOM 更新周期，确保 DOM 已经渲染完成
      await nextTick()
      // 初始化 PhotoSwipe
      initPhotoSwipe()
    }
  },
)

// 组件销毁时清理资源
onBeforeUnmount(() => {
  // 如果 lightbox 实例存在，销毁它
  if (lightbox.value) {
    lightbox.value.destroy()
    lightbox.value = null
  }
})
</script>
