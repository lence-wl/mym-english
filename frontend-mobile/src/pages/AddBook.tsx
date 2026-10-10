import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, Input, notification, Upload } from 'antd'
import type { UploadFile } from 'antd'
import { RiUploadCloud2Line } from '@remixicon/react'
import { addBook } from '../api/book'
import PageShell from '../components/PageShell'

/** 上传电子书（epub） */
const AddBook = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const submit = async (values: any) => {
    const file = fileList[0]?.originFileObj
    if (!file) {
      notification.error({ message: '请选择要上传的 epub 文件' })
      return
    }
    const formData = new FormData()
    formData.append('title', values.title)
    formData.append('author', values.author)
    formData.append('file', file)

    setUploading(true)
    try {
      await addBook(formData)
      notification.success({ message: '上传成功' })
      navigate('/bookshelf')
    } catch (e: any) {
      notification.error({
        message: '上传失败',
        description: e?.data?.message || '请稍后重试',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <PageShell title="上传电子书" onBack={() => navigate(-1)}>
      <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
        <Form.Item
          name="title"
          label="书名"
          rules={[
            { required: true, message: '请输入书名' },
            { max: 200, message: '书名不超过 200 个字符' },
          ]}
        >
          <Input placeholder="请输入书名" />
        </Form.Item>
        <Form.Item
          name="author"
          label="作者"
          rules={[
            { required: true, message: '请输入作者' },
            { max: 20, message: '作者不超过 20 个字符' },
          ]}
        >
          <Input placeholder="请输入作者" />
        </Form.Item>

        <Form.Item label="电子书文件" required>
          <Upload
            accept=".epub"
            maxCount={1}
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList: list }) => setFileList(list.slice(-1))}
            disabled={uploading}
          >
            <Button icon={<RiUploadCloud2Line />}>选择 epub 文件</Button>
          </Upload>
        </Form.Item>

        <Button type="primary" htmlType="submit" block loading={uploading} className="mt-2">
          上传
        </Button>
      </Form>
    </PageShell>
  )
}

export default AddBook