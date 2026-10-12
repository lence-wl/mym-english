import { useEffect, useState } from 'react'
import { Button, Form, Input, notification, Segmented } from 'antd'
import { useNavigate } from 'react-router-dom'
import { RiLockLine, RiMailLine, RiRefreshLine, RiUserLine } from '@remixicon/react'
import { captchaVerify, getCaptcha, userLogin, userRegister } from '../api/user'

/** 移动端登录/注册页 */
const Login = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const [captcha, setCaptcha] = useState({ svg: '', token: '', loading: false })
  const [submitting, setSubmitting] = useState(false)

  const isLogin = mode === 'login'

  const loadCaptcha = async () => {
    setCaptcha((p) => ({ ...p, loading: true }))
    try {
      const { data } = await getCaptcha()
      setCaptcha({ svg: data.svg, token: data.token, loading: false })
      form.setFieldValue('captcha', '')
    } catch {
      setCaptcha((p) => ({ ...p, loading: false }))
    }
  }

  useEffect(() => {
    loadCaptcha()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onFinish = async (values: any) => {
    setSubmitting(true)
    try {
      const { success } = await captchaVerify({
        token: captcha.token,
        code: values.captcha.toUpperCase(),
      })
      if (!success) {
        notification.error({ message: '验证码错误，请重新输入' })
        loadCaptcha()
        return
      }

      if (isLogin) {
        const res = await userLogin({
          username: values.username,
          password: values.password,
        })
        localStorage.setItem('token', res.data.token)
        navigate('/reader', { replace: true })
      } else {
        await userRegister({
          username: values.username,
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword,
        })
        notification.success({ message: '注册成功，请登录' })
        setMode('login')
        form.resetFields()
        loadCaptcha()
      }
    } catch (e: any) {
      notification.error({
        message: isLogin ? '登录失败' : '注册失败',
        description: e?.data?.message || '操作失败',
      })
      loadCaptcha()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="h-full w-full flex flex-col px-6 overflow-y-auto scroll-y"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <div className="pt-10 pb-6 flex flex-col items-start gap-2">
        <img src="/m/icon.png" alt="蔓阅莓" className="w-14 h-14 rounded-xl" />
        <div className="text-2xl font-bold">{isLogin ? '欢迎回来' : '创建账号'}</div>
        <div className="text-sm opacity-60">
          {isLogin ? '登录后继续你的英语阅读' : '填写以下信息注册新账号'}
        </div>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, max: 20, message: '用户名 3-20 个字符' },
          ]}
        >
          <Input prefix={<RiUserLine />} placeholder="请输入用户名" autoComplete="username" />
        </Form.Item>

        {!isLogin && (
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input prefix={<RiMailLine />} placeholder="请输入邮箱" inputMode="email" />
          </Form.Item>
        )}

        <Form.Item
          name="password"
          label="密码"
          rules={
            isLogin
              ? [{ required: true, message: '请输入密码' }]
              : [
                  { required: true, message: '请输入密码' },
                  { min: 8, max: 12, message: '密码长度需为 8-12 位' },
                  { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: '密码需同时包含字母和数字' },
                ]
          }
        >
          <Input.Password prefix={<RiLockLine />} placeholder="请输入密码" autoComplete="current-password" />
        </Form.Item>

        {!isLogin && (
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve()
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password prefix={<RiLockLine />} placeholder="请再次输入密码" />
          </Form.Item>
        )}

        <Form.Item
          name="captcha"
          label="验证码"
          rules={[
            { required: true, message: '请输入验证码' },
            { len: 4, message: '验证码为 4 个字符' },
          ]}
        >
          <div className="flex items-center gap-2">
            <Input placeholder="请输入验证码" maxLength={4} className="flex-1" />
            <div
              className="h-11 w-28 shrink-0 flex items-center justify-center rounded-lg overflow-hidden bg-white/60"
              onClick={loadCaptcha}
              dangerouslySetInnerHTML={{ __html: captcha.svg }}
            />
            <Button
              type="text"
              aria-label="刷新验证码"
              icon={<RiRefreshLine size={20} />}
              onClick={loadCaptcha}
            />
          </div>
        </Form.Item>

        <Button type="primary" htmlType="submit" block loading={submitting} className="mt-2">
          {isLogin ? '登录' : '注册'}
        </Button>
      </Form>

      <div className="flex-1" />
      <div className="py-5 flex justify-center">
        <Segmented
          value={mode}
          onChange={(v) => {
            setMode(v as 'login' | 'register')
            form.resetFields()
            loadCaptcha()
          }}
          options={[
            { label: '登录', value: 'login' },
            { label: '注册', value: 'register' },
          ]}
        />
      </div>
      <div className="pb-3 text-center text-xs opacity-50" style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}>
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
    </div>
  )
}

export default Login