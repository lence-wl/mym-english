import { themes, readingColorConfig } from './themeConfig'
import { type ThemeConfig } from 'antd'
import type { ThemeKey } from './themeConfig'

// 扩展 CSSProperties 以支持伪类和嵌套样式
interface ExtendedCSSProperties extends React.CSSProperties {
  [key: string]: React.CSSProperties | string | number | undefined
}

// 定义 epubjs 主题结构类型
interface EpubTheme {
  body: ExtendedCSSProperties
  h1: ExtendedCSSProperties
  h2: ExtendedCSSProperties
  h3: ExtendedCSSProperties
  h4: ExtendedCSSProperties
  p: ExtendedCSSProperties
  a: ExtendedCSSProperties
  img: ExtendedCSSProperties
  blockquote: ExtendedCSSProperties
  code: ExtendedCSSProperties
  pre: ExtendedCSSProperties
  ul: ExtendedCSSProperties
  ol: ExtendedCSSProperties
  li: ExtendedCSSProperties
  table: ExtendedCSSProperties
  th: ExtendedCSSProperties
  td: ExtendedCSSProperties
  [key: string]: ExtendedCSSProperties
}

// 生成所有主题对应的 epub 主题映射
export const epubThemes: Record<ThemeKey, EpubTheme> = Object.keys(
  themes
).reduce((acc, key) => {
  const themeKey = key as ThemeKey
  acc[themeKey] = {
    body: {
      color: readingColorConfig[themeKey].colorText,
      background: readingColorConfig[themeKey].colorBgContainer,
      fontSize: '20px !important',
    },
  } as any
  return acc
}, {} as Record<ThemeKey, EpubTheme>)
