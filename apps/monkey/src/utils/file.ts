/**
 * 文件处理工具函数
 */

/**
 * 从 URL 中获取文件扩展名
 * @param url - 完整的文件 URL
 * @returns string | undefined - 文件扩展名（不含点号），如果没有扩展名则返回 undefined
 * @example
 * getFileExtensionByUrl('https://example.com/file.mp4') // 返回 'mp4'
 * getFileExtensionByUrl('https://example.com/file') // 返回 undefined
 */
export function getFileExtensionByUrl(url: string) {
  const newUrl = new URL(url)
  const result = newUrl.pathname.split('.').pop()
  return result
}
