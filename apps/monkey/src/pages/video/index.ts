/**
 * 视频页面模块
 * 负责视频播放页面的初始化和相关功能
 */
import { GM_addStyle, GM_cookie } from '$'
import { createApp, defineAsyncComponent } from 'vue'
import { DL_URL_115, NORMAL_URL_115 } from '@/constants/115'
import mainStyles from '@/styles/main.css?inline'
import { core115 } from '@/utils/core115'

/**
 * 重置文档结构
 * 清理原有页面内容，准备加载新的视频播放界面
 */
function resetDocument() {
  // 设置黑色背景和无边距
  document.body.style.backgroundColor = '#000'
  document.body.style.margin = '0'
  // 创建应用根容器
  document.body.innerHTML = `<div id="my-app" data-theme="dark"></div>`
  // 清空标题
  document.title = ''

  // 修复滚动条在主页下丢失的问题
  // 由于 vite-plugin-monkey 的 css 处理会造成全局污染
  GM_addStyle(`
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* 隐藏全屏模式下的滚动条 */
    :fullscreen html::-webkit-scrollbar,
    :fullscreen body::-webkit-scrollbar {
      width: 0 !important;
      height: 0 !important;
      display: none !important
    }
  `)
}

/**
 * 设置视频 Cookie
 * 通过 iframe 与 DL 域名通信设置 Cookie
 * @param cookieDetail - Cookie 详细信息
 * @returns Promise<string> - 设置结果
 */
export function setVideoCookie(cookieDetail: Parameters<typeof GM_cookie.set>[0] & {
  sameSite: 'no_restriction'
}) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.src = `${DL_URL_115}/video/token`
    iframe.style.display = 'none'
    
    window.addEventListener('message', (event) => {
      // 当 iframe 准备就绪时发送设置 Cookie 的请求
      if (event.origin === DL_URL_115 && event.data.event === 'ready') {
        iframe.contentWindow?.postMessage(
          {
            event: 'set-cookies',
            data: cookieDetail,
          },
          DL_URL_115,
        )
      }

      // 处理设置 Cookie 的回调
      if (
        event.origin === DL_URL_115
        && event.data.event === 'set-cookies-callback'
      ) {
        if (event.data.data) {
          reject(event.data.data)
        }
        else {
          resolve('success')
        }
        iframe.remove()
      }
    })
    
    document.body.appendChild(iframe)
  })
}

/**
 * 视频 Token 页面处理
 * 用于在 iframe 中接收和处理设置 Cookie 的请求
 */
export function videoTokenPage() {
  // 向父窗口发送就绪消息
  window.parent.postMessage(
    {
      event: 'ready',
    },
    NORMAL_URL_115,
  )
  
  // 监听来自父窗口的消息
  window.addEventListener('message', (event) => {
    if (event.origin === NORMAL_URL_115 && event.data.event === 'set-cookies') {
      // 设置 Cookie 并发送回调
      GM_cookie.set(event.data.data, (error) => {
        window.parent.postMessage(
          {
            event: 'set-cookies-callback',
            data: error,
          },
          NORMAL_URL_115,
        )
      })
    }
  })
}

/**
 * 视频页面初始化
 * 重置文档结构并加载 Vue 应用
 */
export async function videoPage() {
  resetDocument()
  
  // 添加主样式
  const style = document.createElement('style')
  style.textContent = mainStyles
  style.dataset.v = 'style_css'
  
  // 热更新支持
  if (import.meta.hot) {
    import.meta.hot.accept('@/styles/main.css?inline', (newModule) => {
      style.textContent = newModule?.default || ''
    })
  }
  
  document.head.append(style)

  // 创建并挂载 Vue 应用
  createApp(
    defineAsyncComponent({
      loader: () => import('./index.vue'),
    }),
  ).mount('#my-app')

  // 加载 115 核心功能
  core115.load()
}
