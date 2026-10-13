import request from '../utils/request'

// 获取验证码
export const getCaptcha = () =>
  request.get<{ svg: string; token: string }>('/captcha')
// 验证码校验
export const captchaVerify = (data: { code: string; token: string }) =>
  request.post<any>('/captcha/validate', data)
// 注册用户
export const userRegister = (data: any) =>
  request.post<any>('/auth/register', data)
// 用户登录
export const userLogin = (data: any) => request.post<any>('/auth/login', data)
// 获取当前用户
export const me = () => request.get<any>('/auth/me')
// 更新当前用户的阅读状态
export const updateReadingStatus = (currentBookId: any, currentBookLoc: any) =>
  request.patch<any>('/users/me/reading-status', {
    currentBookId,
    currentBookLoc,
  })

/**
 * 同步上报阅读进度,用 fetch + keepalive:true 发出。
 *
 * 用途:
 *  - Reader 翻页时立即上报(无防抖,或短防抖后调本函数)
 *  - 切书时立即上报(navigate 会 unmount 当前组件,axios XHR 可能被中止)
 *  - pagehide / visibilitychange(hidden) 兜底,关 App / 切后台时把最新 cfi 发出
 *
 * keepalive 请求一旦发出,即使页面立刻被销毁,浏览器也会把请求发完。
 * 鉴权走 JWT header,与主请求一致。
 *
 * currentBookLoc 允许为 null(切到没读过的书、还没翻页),
 * 后端按字段构造 $set,只更新 currentBookId,不会把数据库 currentBookLoc 清空。
 */
export const flushReadingStatus = (currentBookId: any, currentBookLoc: any) => {
  if (currentBookId == null) return
  const token = localStorage.getItem('token')
  // 与主 axios 实例保持一致：baseURL=/api，相对当前 origin
  const url = '/api/users/me/reading-status'
  try {
    fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ currentBookId, currentBookLoc }),
      keepalive: true,
      credentials: 'include',
    }).catch(() => {})
  } catch {
    /* 静默：页面正在卸载，失败也无法处理 */
  }
}