import React, { useRef, useState } from 'react'
import {
  Form,
  Upload,
  Button,
  Input,
  Card,
  message,
  Progress,
  Alert,
  notification,
} from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import { UploadOutlined, BookOutlined } from '@ant-design/icons'
import PageWrapper from '../components/PageWrapper'
import { addBook } from '../api/book'

// 电子书上传表单数据类型定义
interface BookFormValues {
  title: string
  author: string
  file: UploadFile[]
}

const BookUploadPage: React.FC = () => {
  const [form] = Form.useForm()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef(null)

  // 文件上传前的校验
  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    // 重置错误状态
    setUploadError(null)

    // 校验文件类型（主要针对epub，也兼容其他类型）
    const isEpub =
      file.type === 'application/epub+zip' || file.name.endsWith('.epub')
    if (!isEpub) {
      setUploadError('请上传EPUB格式的电子书文件')
      return false
    }

    // 校验文件大小（限制10MB）
    const isLt50M = file.size / 1024 / 1024 < 10
    if (!isLt50M) {
      setUploadError('文件大小不能超过10MB')
      return false
    }
    form.setFieldValue('file', [file])

    return false // 手动控制上传，不自动上传
  }

  // 处理表单提交
  const handleSubmit = async () => {
    // 表单验证
    const values = await form.validateFields()
    const { title, author, file } = values as BookFormValues as any
    // 检查是否选择了文件
    if (!file) {
      notification.open({
        message: '提示',
        type: 'error',
        description: '请选择要上传的电子书',
      })
      return
    }
    // 准备FormData
    const formData = new FormData()
    formData.append('title', title)
    formData.append('author', author)
    formData.append('file', file[0].originFileObj)
    // 设置上传状态
    setUploading(true)
    setProgress(0)
    // 发送上传请求
    try {
      await addBook(formData)
      setUploading(false)
      // 上传成功处理
      notification.open({
        message: '提示',
        type: 'success',
        description: '上传成功',
      })
      form.resetFields()
    } catch (error) {
      // 错误处理
      notification.open({
        message: '提示',
        type: 'error',
        description: '上传失败',
      })
      // 重置上传状态
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <PageWrapper>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px' }}>
        <Card
          title={
            <span>
              <BookOutlined /> 电子书上传
            </span>
          }
          bordered={false}
          style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)' }}
        >
          {uploadError && (
            <Alert
              message="上传错误"
              description={uploadError}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              closable
              onClose={() => setUploadError(null)}
            />
          )}

          <Form form={form} layout="vertical" name="book_upload_form">
            <Form.Item
              name="title"
              label="书名"
              rules={[
                { required: true, message: '请输入电子书标题' },
                { max: 200, message: '标题长度不能超过200个字符' },
              ]}
            >
              <Input placeholder="请输入电子书标题" />
            </Form.Item>

            <Form.Item
              name="author"
              label="作者"
              rules={[
                { required: true, message: '请输入作者名称' },
                { max: 20, message: '作者名称长度不能超过100个字符' },
              ]}
            >
              <Input placeholder="请输入作者名称" />
            </Form.Item>

            <Form.Item
              name="file"
              label="电子书文件"
              rules={[{ required: true, message: '请选择EPUB格式的电子书' }]}
              valuePropName="fileList"
              getValueFromEvent={(e) => {
                if (Array.isArray(e)) {
                  return e
                }
                return e?.fileList || []
              }}
            >
              <Upload
                name="file"
                beforeUpload={beforeUpload}
                listType="text"
                accept=".epub"
                disabled={uploading}
                showUploadList={{
                  showRemoveIcon: !uploading,
                }}
              >
                <Button icon={<UploadOutlined />} disabled={uploading}>
                  选择EPUB文件
                </Button>
                <p style={{ marginTop: 8, color: '#666' }}>
                  支持EPUB格式，最大10MB
                </p>
              </Upload>
            </Form.Item>

            {uploading && (
              <Progress
                percent={progress}
                status="active"
                style={{ marginBottom: 16 }}
              />
            )}

            <Form.Item>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={uploading}
                block
                size="large"
              >
                {uploading ? '上传中...' : '确认上传'}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </PageWrapper>
  )
}

export default BookUploadPage
