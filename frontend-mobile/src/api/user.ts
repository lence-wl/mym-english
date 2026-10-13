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
 * 页面卸载/切后台时同步上报阅读进度。
 *
 * 时机：pagehide / visibilitychange(hidden) / beforeunload。
 * 此时主 axios 实例可能来不及发完请求就被浏览器中止，
 * 这里用 fetch + keepalive:true 兜底，浏览器会在卸载期间继续把请求发完。
 * 鉴权走 JWT header，与主请求一致。
 */
export const flushReadingStatus = (currentBookId: any, currentBookLoc: any) => {
  if (currentBookId == null || currentBookLoc == null) return
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