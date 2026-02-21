/**
 * Vite 构建配置文件
 * @description 负责配置项目的构建过程、插件和输出选项
 */
import { resolve } from 'node:path'
import * as transformer from '@libmedia/cheap/build/transformer'
import typescript from '@rollup/plugin-typescript'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import monkey, { cdn, util } from 'vite-plugin-monkey'
import svgLoader from 'vite-svg-loader'
import PKG from './package.json'

// 环境变量
const env = process.env

/**
 * 图标配置
 */
const icons = {
  prod: 'https://115.com/favicon.ico',  // 生产环境图标
  dev: 'https://vitejs.dev/logo.svg',    // 开发环境图标
}

/**
 * 构建环境判断
 */
const isProd = env.NODE_ENV === 'production'
const isAnalyze = env.ANALYZE === 'true'

/**
 * CDN 配置
 */
const _cdn = cdn.jsdelivrFastly

// https://vitejs.dev/config/
export default defineConfig({
  /**
   * 路径解析配置
   */
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),  // 别名配置，@ 指向 src 目录
    },
  },
  
  /**
   * 构建配置
   */
  build: {
    minify: true,  // 开启代码压缩
  },
  
  /**
   * 依赖优化配置
   */
  optimizeDeps: {
    exclude: ['@libmedia/avplayer'],  // 排除不需要优化的依赖
  },
  
  /**
   * 插件配置
   */
  plugins: [
    /**
     * TypeScript 插件配置
     */
    typescript({
      // 配置使用的 tsconfig.json 配置文件
      tsconfig: './tsconfig.app.json',
      transformers: {
        before: [
          {
            type: 'program',
            factory: (program) => {
              return transformer.before(program)
            },
          },
        ],
      },
    }),
    
    /**
     * Vue 插件
     */
    vue(),
    
    /**
     * Tailwind CSS 插件
     */
    tailwindcss(),
    
    /**
     * SVG 加载器插件
     */
    svgLoader(),
    
    /**
     * 构建分析插件
     */
    visualizer({
      filename: 'dist/stats.html',  // 分析报告文件路径
      open: isAnalyze,              // 是否自动打开分析报告
      gzipSize: true,               // 显示 gzip 压缩大小
      brotliSize: true,             // 显示 brotli 压缩大小
    }),
    
    /**
     * Monkey 插件配置
     * 用于构建 Tampermonkey 脚本
     */
    monkey({
      entry: 'src/main.ts',  // 脚本入口文件
      
      /**
       * 用户脚本配置
       * 对应 Tampermonkey 脚本的元数据
       */
      userscript: {
        'name': '115Master',                     // 脚本名称
        'icon': isProd ? icons.prod : icons.dev,  // 脚本图标
        'namespace': '115Master',                // 脚本命名空间
        'homepage': PKG.homepage,                // 脚本主页
        'author': PKG.author,                    // 脚本作者
        'description': PKG.description,          // 脚本描述
        'supportURL': PKG.bugs?.url,             // 支持链接
        'run-at': 'document-start',              // 脚本运行时机
        'include': [                             // 脚本适用的 URL
          'https://115.com/?ct*',
          'https://115.com/web/lixian/master/video/*',
          'https://115.com/web/lixian/master/magnet/*',
          'https://115.com/?aid*',
          'https://dl.115cdn.net/video/token',
        ],
        'exclude': [                             // 脚本排除的 URL
          'https://*.115.com/bridge*',
          'https://*.115.com/static*',
          'https://q.115.com/*',
        ],
        'connect': [                             // 允许跨域访问的域名
          '115.com',
          '115vod.com',
          'aps.115.com',
          'webapi.115.com',
          'proapi.115.com',
          'cpats01.115.com',
          'dl.115cdn.net',
          'cdnfhnfile.115cdn.net',
          'v.anxia.com',
          'subtitlecat.com',
          'javbus.com',
          'javdb.com',
          'jdbstatic.com',
          'missav.ws',
          'api-shoulei-ssl.xunlei.com',
          'subtitle.v.geilijiasu.com',
        ],
        'resource': {                            // 脚本资源
          icon: 'https://115.com/favicon.ico',
        },
        'downloadURL':                           // 脚本下载链接
          'https://github.com/cbingb666/115master/releases/latest/download/115master.user.js',
        'updateURL':                             // 脚本更新链接
          'https://github.com/cbingb666/115master/releases/latest/download/115master.meta.js',
      },
      
      /**
       * 构建配置
       */
      build: {
        fileName: '115master.user.js',           // 输出文件名
        metaFileName: '115master.meta.js',       // 元数据文件名
        externalGlobals: {                       // 外部全局变量配置
          'vue': _cdn('Vue', 'dist/vue.global.prod.js'),
          'localforage': _cdn('localforage', 'dist/localforage.min.js'),
          'lodash': _cdn('_', 'lodash.min.js'),
          'big-integer': _cdn('bigInt', 'BigInteger.min.js').concat(
            util.dataUrl(';window.bigInt=bigInt;'),
          ),
          'blueimp-md5': _cdn('md5', 'js/md5.min.js'),
          'dayjs': _cdn('dayjs', 'dayjs.min.js').concat(
            util.dataUrl(';window.dayjs=dayjs;'),
          ),
          'hls.js': _cdn('Hls', 'dist/hls.min.js'),
          'm3u8-parser': _cdn('m3u8Parser', 'dist/m3u8-parser.min.js'),
          'photoswipe': _cdn(
            'photoswipe',
            'dist/umd/photoswipe.umd.min.js',
          ).concat(util.dataUrl(';window.photoswipe=PhotoSwipe;')),
          'photoswipe/lightbox': _cdn(
            'PhotoSwipeLightbox',
            'dist/umd/photoswipe-lightbox.umd.min.js',
          ).concat(
            util.dataUrl(';window.PhotoSwipeLightbox=PhotoSwipeLightbox;'),
          ),
        },
      },
    }),
  ],
})
