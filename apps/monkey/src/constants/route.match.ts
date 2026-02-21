/**
 * 路由匹配常量
 * 定义用于匹配不同页面路由的模式
 */
import { DL_HOST_155, NORMAL_HOST_155 } from './115'

const ROUTE_MATCH = {
  /**
   * 115网盘首页路由匹配模式
   * 匹配形如 https://115.com/?* 的URL
   */
  HOME: `*://${NORMAL_HOST_155}/?*`,
  
  /**
   * 115网盘视频播放页路由匹配模式
   * 匹配形如 https://115.com/web/lixian/master/video/* 的URL
   */
  VIDEO: `*://${NORMAL_HOST_155}/web/lixian/master/video/*`,
  
  /**
   * 115网盘磁力链接页路由匹配模式
   * 匹配形如 https://115.com/web/lixian/master/magnet/* 的URL
   */
  MAGNET: `*://${NORMAL_HOST_155}/web/lixian/master/magnet/*`,
  
  /**
   * 115网盘视频token获取路由匹配模式
   * 匹配形如 https://dl.115cdn.net/video/token 的URL
   */
  VIDEO_TOKEN: `*://${DL_HOST_155}/video/token`,
}

export default ROUTE_MATCH
