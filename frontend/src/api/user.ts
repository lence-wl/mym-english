import request from '../utils/request'
import useStore from '../store'
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
export const updateReadingStatus = () => {
  // 每次调用时才获取最新状态
  const { currentBookId, currentBookLoc } = useStore.getState().userInfo
  return request.patch<any>(`/users/me/reading-status`, {
    currentBookId,
    currentBookLoc,
  })
}

// 指定书籍的阅读进度上报（用于登录后合并游客本地进度）
export const updateReadingStatusById = (
  currentBookId: number | string,
  currentBookLoc: string | null,
) =>
  request.patch<any>(`/users/me/reading-status`, {
    currentBookId,
    currentBookLoc,
  })
