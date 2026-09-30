import React, { useState, useEffect, useRef } from 'react'
import {
  Form,
  Input,
  Button,
  Card,
  Divider,
  Row,
  Col,
  Typography,
  message,
  notification,
} from 'antd'

import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../styles/authPage.css'
import { getCaptcha, captchaVerify, userRegister, userLogin } from '../api/user'
import ThemeSwitcher from '../components/ThemeSwitcher'

const { Title, Text, Link: AntLink } = Typography

// 验证码请求工具函数
const captchaAPI = {
  getCaptcha: async () => {
    const response = await axios.get('/api/captcha', {
      responseType: 'blob',
    })
    const token = response.headers['x-captcha-id']
    const imageUrl = URL.createObjectURL(response.data)
    return { imageUrl, token }
  },
  verifyCaptcha: async (token: string, code: string) => {
    try {
      const { success } = await captchaVerify({
        token: token,
        code,
      })
      return success
    } catch (error) {
      console.error('验证码验证失败:', error)
      return false
    }
  },
}

export default () => {
  const [isLogin, setIsLogin] = useState(true)
  const [form] = Form.useForm()
  const [captchaState, setCaptchaState] = useState({
    imageUrl: '',
    token: '',
    loading: false,
  })
  const navigate = useNavigate()
  const captchaImgRef = useRef<HTMLImageElement>(null)

  // 加载验证码
  const loadCaptcha = async () => {
    try {
      setCaptchaState((prev) => ({ ...prev, loading: true }))
      const { data } = await getCaptcha()
      const { svg, token } = data
      setCaptchaState({
        imageUrl: svg,
        token: token,
        loading: false,
      })
      form.setFieldValue('captcha', '')
    } catch (error) {
      setCaptchaState((prev) => ({ ...prev, loading: false }))
    }
  }

  // 初始化时加载验证码
  useEffect(() => {
    loadCaptcha()

    // 清理图片URL，避免内存泄漏
    return () => {
      if (captchaState.imageUrl) {
        URL.revokeObjectURL(captchaState.imageUrl)
      }
    }
  }, [])

  // 切换登录/注册模式
  const toggleAuthMode = () => {
    setIsLogin(!isLogin)
    form.resetFields()
    loadCaptcha() // 切换模式时刷新验证码
  }

  // 表单提交处理
  const onFinish = async (values: any) => {
    try {
      // 验证验证码
      const isCaptchaValid = await captchaAPI.verifyCaptcha(
        captchaState.token,
        values.captcha.toUpperCase()
      )
      if (!isCaptchaValid) {
        notification.open({
          message: '提示',
          type: 'error',
          description: '验证码错误，请重新输入',
        })
        form.resetFields(['captcha'])
        loadCaptcha() // 验证失败后刷新验证码
        return
      }

      if (isLogin) {
        try {
          // 登录逻辑
          const loginResponse = await userLogin({
            username: values.username,
            password: values.password,
          })
          notification.open({
            message: '登录成功',
            type: 'success',
          })
          // 保存token等登录状态
          localStorage.setItem('token', loginResponse.data.token)
          navigate('/')
        } catch (err: any) {
          notification.open({
            message: '登录失败',
            type: 'error',
            description: err.data.message,
          })
        }
      } else {
        // 注册逻辑
        try {
          // 仅提交后端 CreateUserDto 定义的字段，避免 captcha 等多余字段触发校验 400
          await userRegister({
            username: values.username,
            email: values.email,
            password: values.password,
            confirmPassword: values.confirmPassword,
          })
          message.success('注册成功，请登录')
          setIsLogin(true)
          form.resetFields()
          loadCaptcha()
        } catch (e: any) {
          notification.open({
            message: '注册失败',
            type: 'error',
            description: e.data.message,
          })
        }
      }
    } catch (error: any) {
      notification.open({
        message: '提示',
        type: 'error',
        description: error.data?.message || '操作失败',
      })
      loadCaptcha()
    }
  }

  return (
    <>
      <ThemeSwitcher></ThemeSwitcher>
      <div className="auth-page-container">
        <Row justify="center" align="middle" className="auth-content">
          {/* 右侧表单区域 */}
          <Col xs={24} md={10} lg={12}>
            <Card className="auth-card p-[0px]">
              <div className="auth-header">
                <Title level={3} className="auth-title">
                  {isLogin ? '欢迎回来' : '创建账号'}
                </Title>
                <Text className="auth-subtitle">
                  {isLogin
                    ? '请输入您的账号信息登录'
                    : '填写以下信息注册新账号'}
                </Text>
              </div>
              <Form
                form={form}
                name="authForm"
                labelCol={{ span: 4 }}
                labelAlign="left"
                onFinish={onFinish}
              >
                <Form.Item
                  name="username"
                  label="用户名"
                  rules={[
                    { required: true, message: '请输入用户名' },
                    { min: 3, message: '用户名至少3个字符' },
                    { max: 20, message: '用户名最多20个字符' },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined className="input-icon" />}
                    placeholder="请输入用户名"
                  />
                </Form.Item>

                {!isLogin && (
                  <Form.Item
                    name="email"
                    label="邮箱"
                    rules={[
                      { required: true, message: '请输入邮箱' },
                      { type: 'email', message: '请输入正确的邮箱格式' },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined className="input-icon" />}
                      placeholder="请输入邮箱"
                    />
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
                          { min: 8, max: 12, message: '密码长度需为8-12位' },
                          {
                            pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                            message: '密码需同时包含字母和数字',
                          },
                        ]
                  }
                >
                  <Input.Password
                    prefix={<LockOutlined className="input-icon" />}
                    placeholder="请输入密码"
                    iconRender={(visible) =>
                      visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                    }
                  />
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
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve()
                          }
                          return Promise.reject(
                            new Error('两次输入的密码不一致')
                          )
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined className="input-icon" />}
                      placeholder="请确认密码"
                      iconRender={(visible) =>
                        visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                      }
                    />
                  </Form.Item>
                )}

                {/* 验证码区域 */}
                <Form.Item
                  name="captcha"
                  label="验证码"
                  rules={[
                    { required: true, message: '请输入验证码' },
                    { len: 4, message: '验证码为4个字符' },
                  ]}
                >
                  <Row gutter={8} align="middle">
                    {/* 验证码输入框占主要宽度 */}
                    <Col>
                      <Input
                        prefix={<LockOutlined className="input-icon" />}
                        placeholder="请输入验证码"
                        maxLength={4}
                      />
                    </Col>
                    {/* 验证码图片和刷新按钮在同一行右侧 */}
                    <Col>
                      <div className="captcha-container">
                        {captchaState.loading ? (
                          <div className="captcha-loading">
                            <LoadingOutlined spin />
                          </div>
                        ) : (
                          <>
                            <div
                              onClick={loadCaptcha}
                              ref={captchaImgRef}
                              className="captcha-image"
                              dangerouslySetInnerHTML={{
                                __html: captchaState.imageUrl,
                              }}
                              style={{ height: '40px' }}
                            />
                          </>
                        )}
                        <Button
                          icon={<ReloadOutlined />}
                          className="refresh-captcha"
                          onClick={loadCaptcha}
                          size="small"
                        />
                      </div>
                    </Col>
                  </Row>
                </Form.Item>

                {isLogin && (
                  <Form.Item className="remember-me">
                    <AntLink className="forgot-link">忘记密码?</AntLink>
                  </Form.Item>
                )}

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="submit-button"
                    block
                    icon={<ArrowRightOutlined />}
                  >
                    {isLogin ? '登录' : '注册'}
                  </Button>
                </Form.Item>

                <Divider className="auth-divider">
                  <Text type="secondary">
                    {isLogin ? '还没有账号?' : '已有账号?'}
                  </Text>
                </Divider>

                <Button type="text" onClick={toggleAuthMode} block>
                  {isLogin ? '立即注册' : '立即登录'}
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>
      {/* 备案信息区域 */}
      <div className="flex justify-center w-full fixed left-0 bottom-0">
        <div className="flex justify-between gap-4 bg-light-900 pt-[8px]">
          <Text type="secondary">
            备案号：
            <AntLink href="https://beian.miit.gov.cn/" target="_blank">
              豫ICP备2025153216号
            </AntLink>
          </Text>
          <Text type="secondary">©{new Date().getFullYear()} 版权所有</Text>
        </div>
      </div>
    </>
  )
}
