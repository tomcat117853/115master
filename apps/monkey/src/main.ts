/**
 * 115Master 应用主入口文件
 * @description 负责应用的初始化、路由匹配和页面加载
 */

// 导入依赖
import { TEST_VALUE } from '@115master/shared'  // 测试 monorepo 共享包引用
import globToRegex from 'glob-to-regexp'  // 用于将 glob 模式转换为正则表达式
import ROUTE_MATCH from './constants/route.match'  // 路由匹配模式
import HomePage from './pages/home/index'  // 首页
import { magnetPage, registerMagnetProtocolHandler } from './pages/magnet'  // 磁力链接相关
import { videoPage, videoTokenPage } from './pages/video'  // 视频页相关
import { checkUserAgent } from './utils/checkUserAgent'  // 检查用户代理
import { debugInfo } from './utils/debugInfo'  // 调试信息

// 打印共享包测试信息
console.log('[115Master] Shared package:', TEST_VALUE)

/**
 * 设置 document.domain 以支持 115 Bridge 跨域通信
 * @description 必须在任何代码执行之前设置，确保与 115.com 域下的其他页面能够正常通信
 */
try {
  if (document.domain && document.domain.endsWith('115.com')) {
    document.domain = '115.com'
  }
}
catch (error) {
  // 某些浏览器可能不允许设置 domain
  console.warn('[115Master] Failed to set document.domain:', error)
}

/**
 * 输出启动调试信息
 * @description 显示应用启动时的环境信息，有助于调试
 */
debugInfo.bootstrapInfo()

/**
 * 检查用户代理
 * @description 检测用户的浏览器和设备信息，用于适配不同环境
 */
checkUserAgent()

/**
 * 注册磁力链接协议处理程序
 * @description 允许应用处理 magnet: 协议的链接
 */
registerMagnetProtocolHandler()

/**
 * 路由匹配配置
 * @description 定义应用支持的路由和对应的处理函数
 */
const routeMatch = [
  /** 首页路由 */
  {
    match: ROUTE_MATCH.HOME,  // 匹配首页路径
    exec: () => new HomePage(),  // 执行首页初始化
  },
  /** 视频页路由 */
  {
    match: ROUTE_MATCH.VIDEO,  // 匹配视频页路径
    exec: () => videoPage(),  // 执行视频页初始化
  },
  /** 视频页（token中转）路由 */
  {
    match: ROUTE_MATCH.VIDEO_TOKEN,  // 匹配视频 token 中转页路径
    exec: () => videoTokenPage(),  // 执行视频 token 中转页初始化
  },
  /** 磁力链接页路由 */
  {
    match: ROUTE_MATCH.MAGNET,  // 匹配磁力链接页路径
    exec: () => magnetPage(),  // 执行磁力链接页初始化
  },
]

/**
 * 主函数
 * @description 匹配当前路由并执行对应的初始化函数
 */
function main() {
  // 遍历所有路由配置
  for (const route of routeMatch) {
    // 将路由匹配模式转换为正则表达式并测试当前 URL
    if (globToRegex(route.match).test(window.location.href)) {
      // 执行匹配到的路由处理函数
      route.exec()
    }
  }
}

/**
 * 检查文档加载状态并执行主函数
 * @description 如果文档已经加载完成或交互阶段，则立即执行主函数
 *              否则，监听 DOMContentLoaded 事件，在文档加载完成后执行
 */
if (
  document.readyState === 'complete'  // 文档已完全加载
  || document.readyState === 'interactive'  // 文档已加载，正在交互
) {
  main()  // 立即执行主函数
}
else {
  // 监听 DOMContentLoaded 事件，在文档加载完成后执行主函数
  window.addEventListener('DOMContentLoaded', main)
}
