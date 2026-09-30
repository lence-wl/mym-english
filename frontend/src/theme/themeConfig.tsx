import { type ThemeConfig, theme } from 'antd'
import {
  RiSunLine,
  RiMoonLine,
  RiLeafLine,
  RiEyeLine,
  RiContrastLine,
  RiPaletteLine,
  RiCupLine,
} from '@remixicon/react'

const { darkAlgorithm, defaultAlgorithm } = theme

// 通用组件配置
const compConfig: any = {
  Input: { borderRadius: 8, height: 40, fontSize: 15 },
  InputPassword: { height: 40, borderRadius: 8 },
  Button: { borderRadius: 8, height: 40, fontSize: 16 },
  Form: { labelHeight: 40 },
  Checkbox: { fontSize: 14 },
  Select: {
    dropdownBg: 'var(--ant-color-bg-elevated)',
    dropdownBorderColor: 'var(--ant-color-border)',
    itemSelectedBg: 'var(--ant-color-primary-light-9)',
    itemSelectedColor: 'var(--ant-color-primary)',
  },
}

// 主题配置
export const themes: Record<string, ThemeConfig> = {
  // 默认主题：柔和白
  white: {
    algorithm: defaultAlgorithm,
    token: {
      colorPrimary: '#6d8b74', // 柔和青绿（主色不刺眼，适合阅读场景）
      colorSuccess: '#7d9d78', // 浅绿
      colorError: '#b97b75', // 浅红
      fontSize: 14,
      borderRadius: 8,
      controlHeight: 40,
      colorBgContainer: '#f9f7f3', // 米白背景（接近纸张色，护眼）
      colorBgElevated: '#ffffff', // 卡片白底
      colorText: '#374151', // 深灰文字（比纯黑柔和，减轻眼疲劳）
      colorTextSecondary: '#6b7280', // 中灰辅助文字
      colorBorder: '#e5e2db', // 浅灰边框
    },
    components: compConfig,
  },

  dark: {
    algorithm: darkAlgorithm,
    token: {
      fontSize: 14,
      borderRadius: 8,
      controlHeight: 40,
      colorBgContainer: '#2c2c2c',
      colorBgElevated: '#383838',
      colorText: '#e0e0e0',
      colorTextSecondary: '#b0b0b0',
      colorBorder: '#444444',
    },
    components: compConfig,
  },

  green: {
    algorithm: defaultAlgorithm,
    token: {
      colorPrimary: '#5a9e6f',
      colorSuccess: '#4a8c5e',
      colorError: '#c45858',
      fontSize: 14,
      borderRadius: 8,
      controlHeight: 40,
      colorBgContainer: '#f8faf8',
      colorBgElevated: '#ffffff',
      colorText: '#2d3748',
      colorTextSecondary: '#4a5568',
      colorBorder: '#cce5cc',
    },
    components: compConfig,
  },

  vintage: {
    algorithm: defaultAlgorithm,
    token: {
      colorPrimary: '#8b5a2b',
      colorSuccess: '#6b8e23',
      colorError: '#8b0000',
      fontSize: 14,
      borderRadius: 8,
      controlHeight: 40,
      colorBgContainer: '#f5f1e6',
      colorBgElevated: '#faf6ed',
      colorText: '#3e2723',
      colorTextSecondary: '#5d4037',
      colorBorder: '#d7ccc8',
    },
    components: compConfig,
  },

  purple: {
    algorithm: defaultAlgorithm,
    token: {
      colorPrimary: '#7b68ee',
      colorSuccess: '#66bb6a',
      colorError: '#ef5350',
      fontSize: 14,
      borderRadius: 8,
      controlHeight: 40,
      colorBgContainer: '#f3f1fb',
      colorBgElevated: '#ffffff',
      colorText: '#282438',
      colorTextSecondary: '#4a4564',
      colorBorder: '#d1c4e9',
    },
    components: compConfig,
  },

  eyeCare: {
    algorithm: defaultAlgorithm,
    token: {
      colorPrimary: '#a08c58',
      colorSuccess: '#7d925a',
      colorError: '#b96767',
      fontSize: 14,
      borderRadius: 8,
      controlHeight: 40,
      colorBgContainer: '#f0f4e8',
      colorBgElevated: '#f8fbe6',
      colorText: '#3e4c3a',
      colorTextSecondary: '#5c6b58',
      colorBorder: '#d7dbbc',
    },
    components: compConfig,
  },

  highContrast: {
    algorithm: defaultAlgorithm,
    token: {
      colorPrimary: '#ff5722',
      colorSuccess: '#00e676',
      colorError: '#f50057',
      fontSize: 15,
      borderRadius: 8,
      controlHeight: 44,
      colorBgContainer: '#ffffff',
      colorBgElevated: '#fafafa',
      colorText: '#000000',
      colorTextSecondary: '#212121',
      colorBorder: '#000000',
    },
    components: compConfig,
  },
}

// 主题选项配置（同步修改默认主题的名称）
export const themeOptions = [
  { key: 'white', label: '柔米白', icon: <RiSunLine size={16} /> },
  { key: 'dark', label: '暮夜黑', icon: <RiMoonLine size={16} /> },
  { key: 'green', label: '清新绿', icon: <RiLeafLine size={16} /> },
  { key: 'vintage', label: '复古棕', icon: <RiCupLine size={16} /> },
  { key: 'purple', label: '优雅紫', icon: <RiPaletteLine size={16} /> },
  { key: 'eyeCare', label: '护眼黄', icon: <RiEyeLine size={16} /> },
  { key: 'highContrast', label: '活力橙', icon: <RiContrastLine size={16} /> },
]

// 导出主题类型
export type ThemeKey = keyof typeof themes

// 7组加深版阅读配色对象（增强对比度，切换时差异更明显）
export const readingColorConfig: Record<string, any> = {
  white: {
    colorBgContainer: '#ffffff', // 纯净白（更亮，与其他主题区分明显）
    colorText: '#202124', // 标准黑灰（提升对比度）
  },
  dark: {
    colorBgContainer: '#121212', // 纯黑（加深，与亮色主题反差强烈）
    colorText: '#e8eaed', // 亮灰（提升与黑色背景的对比度）
  },
  green: {
    colorBgContainer: '#bfe3c1', // 鲜亮绿（提高饱和度，绿色特征更明显）
    colorText: '#0d3b10', // 深墨绿（与绿色背景形成强对比）
  },
  vintage: {
    colorBgContainer: '#e6d4ba', // 暖棕黄（更接近老书页色调，与其他主题区分度高）
    colorText: '#3a2618', // 深棕褐（增强暖调对比）
  },
  purple: {
    colorBgContainer: '#c9b9e9', // 明显紫（提高紫色饱和度，避免与其他浅色混淆）
    colorText: '#2a1b47', // 深紫黑（强化紫色主题特征）
  },
  eyeCare: {
    colorBgContainer: '#f0e6c8', // 暖黄底（更接近传统护眼纸色，与其他浅色差异显著）
    colorText: '#2d3b21', // 深橄榄绿（与暖黄形成自然对比）
  },
  highContrast: {
    colorBgContainer: '#ffb380', // 明亮橙（大幅提高饱和度，视觉冲击力强）
    colorText: '#000000', // 纯黑（最大化对比度，符合高对比需求）
  },
}
