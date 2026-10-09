import { useNavigate } from 'react-router-dom'
import { Button } from 'antd'
import { RiAddLine, RiLogoutBoxRLine } from '@remixicon/react'
import PageShell from '../components/PageShell'
import ThemeSwitcher from '../components/ThemeSwitcher'
import useStore from '../store'

/** 我的：账号信息、阅读统计、外观与入口 */
const Me = () => {
  const navigate = useNavigate()
  const { userInfo } = useStore()

  const logout = () => {
    localStorage.removeItem('token')
    navigate('/login', { replace: true })
  }

  return (
    <PageShell title="我的">
      <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'var(--ant-color-bg-elevated, #fff)' }}>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
          style={{ background: 'var(--ant-color-primary)' }}
        >
          {(userInfo.username || '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-semibold truncate">{userInfo.username || '未登录'}</div>
          <div className="text-xs opacity-60">专注英语阅读与生词积累</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--ant-color-bg-elevated, #fff)' }}>
          <div className="text-2xl font-bold" style={{ color: '#6d8b74' }}>
            {userInfo.wordCount || 0}
          </div>
          <div className="text-xs opacity-60 mt-1">生词</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--ant-color-bg-elevated, #fff)' }}>
          <div className="text-2xl font-bold" style={{ color: '#6d8b74' }}>
            {userInfo.sentenceCount || 0}
          </div>
          <div className="text-xs opacity-60 mt-1">句子</div>
        </div>
      </div>

      <div
        className="rounded-xl p-4 mt-3 flex items-center justify-between"
        style={{ background: 'var(--ant-color-bg-elevated, #fff)' }}
      >
        <div className="text-sm">主题颜色</div>
        <ThemeSwitcher />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Button block icon={<RiAddLine />} onClick={() => navigate('/addBook')}>
          上传电子书
        </Button>
        <Button block danger icon={<RiLogoutBoxRLine />} onClick={logout}>
          退出登录
        </Button>
      </div>

      <div className="text-center text-xs opacity-40 mt-6">
        豫ICP备2025153216号 · ©{new Date().getFullYear()}
      </div>
    </PageShell>
  )
}

export default Me