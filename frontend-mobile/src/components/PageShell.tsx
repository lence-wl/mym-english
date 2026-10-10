import type { ReactNode } from 'react'
import { RiArrowLeftSLine } from '@remixicon/react'

interface PageShellProps {
  title: string
  /** 传入后在标题左侧展示返回按钮 */
  onBack?: () => void
  extra?: ReactNode
  children: ReactNode
}

/** 移动端二级页面外壳：固定标题栏 + 可滚动内容区（高度由上层 flex 外壳决定） */
const PageShell = ({ title, onBack, extra, children }: PageShellProps) => (
  <div className="h-full flex flex-col">
    <header
      className="shrink-0 flex items-center gap-2 px-2"
      style={{
        paddingTop: 'var(--safe-top)',
        height: 'calc(48px + var(--safe-top))',
        background: 'var(--global-bg-elevated, #fff)',
      }}
    >
      {onBack ? (
        <button className="p-2 no-select" onClick={onBack} aria-label="返回">
          <RiArrowLeftSLine size={26} />
        </button>
      ) : null}
      <h1 className="text-[17px] font-semibold m-0 flex-1 truncate">{title}</h1>
      {extra}
    </header>
    <div className="flex-1 min-h-0 scroll-y px-4 pt-3 pb-4">{children}</div>
  </div>
)

export default PageShell