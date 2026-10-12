import { themes, readingColorConfig, type ThemeKey } from './themeConfig'

// 禁用原生文本选择与长按呼叫菜单：否则 iOS/Android 会弹出系统菜单（拷贝/查询/翻译），
// 盖住我们自己的长按查词交互。查词改为在 EpubReader 内用 caretRangeFromPoint 自行命中。
// 必须带 !important：正文自带 CSS 里的同类声明优先级可能高于 body 上的规则。
const noSelect = {
  '-webkit-user-select': 'none !important',
  'user-select': 'none !important',
  '-webkit-touch-callout': 'none !important',
  
}

// 生成所有主题对应的 epub 主题映射
// 注意：移动端基准字号由阅读器的 themes.fontSize() 动态控制，这里不再写死 !important
export const epubThemes: Record<string, any> = Object.keys(themes).reduce(
  (acc, key) => {
    const themeKey = key as ThemeKey
    acc[themeKey] = {
      body: {
        color: readingColorConfig[themeKey].colorText,
        background: readingColorConfig[themeKey].colorBgContainer,
        'padding-top': '0 !important',
        'padding-bottom': '0 !important',
        ...noSelect,
      },
      // 只用 body 不够：正文里 em/strong/a 等元素若被书自带样式单独声明过，
      // 继承会被打断，所以对所有后代再声明一次
      'body *': { ...noSelect },
      a: { color: readingColorConfig[themeKey].colorText },
    }
    return acc
  },
  {} as Record<string, any>,
)

/**
 * 生成正文行高规则。
 *
 * 为什么不用 themes.override：override 只在 html 元素上声明，而书籍 CSS 常把
 * line-height 直接写在 body/p 上，直接声明强于继承，html 上的声明（哪怕带
 * !important）也压不住，所以必须写进样式表并对 body 及全部后代显式声明。
 *
 * 为什么挂在保留的 default 主题上：epubjs 每次加载内容都会注入 default 主题，
 * 而行高与配色无关、对所有主题通用，挂在这里即可自动随章节加载生效。
 */
export const buildTypographyRules = (lineHeight: number) => ({
  body: { 'line-height': `${lineHeight} !important` },
  // 只声明 body 不够：正文段落若自带 line-height，继承会被打断
  'body *': { 'line-height': `${lineHeight} !important` },
})