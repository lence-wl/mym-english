import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'antd'
import { RiAddLine, RiLogoutBoxRLine } from '@remixicon/react'
import PageShell from '../components/PageShell'
import ThemeSwitcher from '../components/ThemeSwitcher'
import { me } from '../api/user'
import useStore from '../store'

/** 我的：账号信息、阅读统计、外观与入口 */
const Me = () => {
  const navigate = useNavigate()
  const { userInfo, resetUserInfo, updateUserInfo } = useStore()

  // 进入页面时刷新用户信息：生词/句子统计会随阅读与收藏变化，避免显示旧数据
  // 注意：只更新统计/账号相关字段，**不要整体合并 data**——
  // me() 返回的 currentBookLoc / myBookData 是后端上次落盘的值，可能落后于 store 里的最新进度
  // (Reader 防抖 800ms 内翻到的位置还没上报)。整体覆盖会让 store 回退到旧进度，
  // 用户回 Reader 就会从更早的位置继续读。
  useEffect(() => {
    let alive = true
    me()
      .then(({ data }) => {
        if (!alive) return
        updateUserInfo({
          username: data.username,
          email: data.email,
          role: data.role,
          phone: data.phone,
          avatar: data.avatar,
          level: data.level,
          status: data.status,
          wordCount: data.wordCount,
          sentenceCount: data.sentenceCount,
          readingBook: data.readingBook,
          completedBooks: data.completedBooks,
        })
      })
      .catch(() => {
        /* 刷新失败时沿用现有数据，不阻塞页面 */
      })
    return () => {
      alive = false
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    // 必须清空内存里的用户信息：否则切号后 PrivateRoute 因 username 仍在而不重新拉取，
    // 页面会继续显示上一个账号的数据
    resetUserInfo()
    navigate('/login', { replace: true })
  }

  return (
    <PageShell title="我的">
      <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'var(--global-bg-elevated, #fff)' }}>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
          style={{ background: 'var(--global-primary)' }}
        >
          {(userInfo.username || '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-semibold truncate">{userInfo.username || '未登录'}</div>
          <div className="text-xs opacity-60">专注英语阅读与生词积累</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--global-bg-elevated, #fff)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--global-primary)' }}>
            {userInfo.wordCount || 0}
          </div>
          <div className="text-xs opacity-60 mt-1">生词</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--global-bg-elevated, #fff)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--global-primary)' }}>
            {userInfo.sentenceCount || 0}
          </div>
          <div className="text-xs opacity-60 mt-1">句子</div>
        </div>
      </div>

      <div
        className="rounded-xl p-4 mt-3 flex items-center justify-between"
        style={{ background: 'var(--global-bg-elevated, #fff)' }}
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
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'inherit' }}
        >
          豫ICP备2025153216号
        </a>
        {' · '}©{new Date().getFullYear()}
        {/* 公安联网备案办好后，在「·」前追加公安备案号并链接到 https://beian.mps.gov.cn/ */}
      </div>
    </PageShell>
  )
}

export default Me