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

// 移动端：控件尺寸整体放大，便于触控
const compConfig: any = {
  Input: { borderRadius: 10, height: 44, fontSize: 16 },
  InputPassword: { height: 44, borderRadius: 10 },
  Button: { borderRadius: 10, controlHeight: 46, fontSize: 16 },
  Form: { labelHeight: 40 },
  Select: {
    dropdownBg: 'var(--ant-color-bg-elevated)',
    itemSelectedBg: 'var(--ant-color-primary-light-9)',
    itemSelectedColor: 'var(--ant-color-primary)',
  },
}

export const themes: Record<string, ThemeConfig> = {
  white: {
    algorithm: defaultAlgorithm,
    token: {
      colorPrimary: '#6d8b74',
      colorSuccess: '#7d9d78',
      colorError: '#b97b75',
      fontSize: 15,
      borderRadius: 10,
      controlHeight: 44,
      colorBgContainer: '#f9f7f3',
      colorBgElevated: '#ffffff',
      colorText: '#374151',
      colorTextSecondary: '#6b7280',
      colorBorder: '#e5e2db',
    },
    components: compConfig,
  },
  dark: {
    algorithm: darkAlgorithm,
    token: {
      fontSize: 15,
      borderRadius: 10,
      controlHeight: 44,
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
      fontSize: 15,
      borderRadius: 10,
      controlHeight: 44,
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
      fontSize: 15,
      borderRadius: 10,
      controlHeight: 44,
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
      fontSize: 15,
      borderRadius: 10,
      controlHeight: 44,
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
      fontSize: 15,
      borderRadius: 10,
      controlHeight: 44,
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
      fontSize: 16,
      borderRadius: 10,
      controlHeight: 48,
      colorBgContainer: '#ffffff',
      colorBgElevated: '#fafafa',
      colorText: '#000000',
      colorTextSecondary: '#212121',
      colorBorder: '#000000',
    },
    components: compConfig,
  },
}

export const themeOptions = [
  { key: 'white', label: '柔米白', icon: <RiSunLine size={18} /> },
  { key: 'dark', label: '暮夜黑', icon: <RiMoonLine size={18} /> },
  { key: 'green', label: '清新绿', icon: <RiLeafLine size={18} /> },
  { key: 'vintage', label: '复古棕', icon: <RiCupLine size={18} /> },
  { key: 'purple', label: '优雅紫', icon: <RiPaletteLine size={18} /> },
  { key: 'eyeCare', label: '护眼黄', icon: <RiEyeLine size={18} /> },
  { key: 'highContrast', label: '活力橙', icon: <RiContrastLine size={18} /> },
]

export type ThemeKey = keyof typeof themes

export const readingColorConfig: Record<string, any> = {
  white: { colorBgContainer: '#ffffff', colorText: '#202124' },
  dark: { colorBgContainer: '#121212', colorText: '#e8eaed' },
  green: { colorBgContainer: '#bfe3c1', colorText: '#0d3b10' },
  vintage: { colorBgContainer: '#e6d4ba', colorText: '#3a2618' },
  purple: { colorBgContainer: '#c9b9e9', colorText: '#2a1b47' },
  eyeCare: { colorBgContainer: '#f0e6c8', colorText: '#2d3b21' },
  highContrast: { colorBgContainer: '#ffb380', colorText: '#000000' },
}