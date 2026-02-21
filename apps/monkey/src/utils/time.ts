/**
 * 时间处理工具函数
 */

/**
 * 模糊时间
 * 将时间值模糊到指定的间隔，用于视频缩略图时间点计算
 * @param time - 原始时间（秒）
 * @param blur - 模糊间隔（秒）
 * @param max - 最大时间值（秒）
 * @returns number - 模糊后的时间值
 * @example
 * blurTime(125, 60, 300) // 返回 150
 * blurTime(10, 5, 60) // 返回 10
 */
export function blurTime(time: number, blur: number, max: number) {
  const _blurTime = time - (time % blur) + blur / 2
  return Math.max(0, Math.min(_blurTime, max))
}

/**
 * 获取时长
 * 将时间字符串转换为秒数
 * @param time - 时长字符串，格式为 "HH:MM:SS" 或 "MM:SS"
 * @returns number - 转换后的秒数
 * @example
 * getDuration("10:00") // 返回 600
 * getDuration("01:00:00") // 返回 3600
 * getDuration("00:01:00") // 返回 60
 * getDuration("00:00:01") // 返回 1
 * getDuration() // 返回 0
 */
export function getDuration(time?: string) {
  if (!time) {
    return 0
  }
  const [seconds = 0, minutes = 0, hours = 0] = time
    .split(':')
    .map(Number)
    .reverse()
  return hours * 3600 + minutes * 60 + seconds
}
