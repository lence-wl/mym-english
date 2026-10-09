import { Select } from 'antd'
import { themeOptions, type ThemeKey } from '../theme/themeConfig'
import useStore from '../store'

/** 主题切换：移动端用下拉选择（选项有 7 个，横滑单选会溢出导致横向滚动） */
const ThemeSwitcher = () => {
  const theme = useStore((s) => s.themeConfig.theme)
  const updateThemeConfig = useStore((s) => s.updateThemeConfig)

  return (
    <Select
      value={theme}
      onChange={(v) => updateThemeConfig({ theme: v as ThemeKey })}
      style={{ width: 132 }}
      options={themeOptions.map((o) => ({
        value: o.key,
        label: (
          <span className="flex items-center gap-2">
            {o.icon}
            {o.label}
          </span>
        ),
      }))}
    />
  )
}

export default ThemeSwitcher