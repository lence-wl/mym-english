import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  AxiosError,
} from 'axios'

// 定义接口返回数据的通用结构
export interface IResponseData<T = any> {
  code: number
  success: boolean
  msg: string
  data: T
}

// 自定义错误类
export class RequestError extends Error {
  code: number
  data: any

  constructor(message: string, code: number, data?: any) {
    super(message)
    this.name = 'RequestError'
    this.code = code
    this.data = data
  }
}

// 创建请求实例
class Request {
  private instance: AxiosInstance
  private readonly options: AxiosRequestConfig

  constructor(options: AxiosRequestConfig = {}) {
    this.options = options
    this.instance = axios.create(options)

    this.setupInterceptors()
  }

  // 设置拦截器
  private setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token')
        if (token) {
          if (!config.headers?.Authorization)
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error: AxiosError) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // 在这里可以添加响应成功的逻辑
        return response
      },
      (error: AxiosError) => {
        // 在这里可以添加响应错误的逻辑
        if (error.response) {
          // 服务器返回了错误状态码
          const { status, data } = error.response
          return Promise.reject(
            new RequestError(
              `Request failed with status code ${status}`,
              status,
              data
            )
          )
        } else if (error.request) {
          // 请求已发出但没有收到响应
          return Promise.reject(
            new RequestError('No response received from server', -1)
          )
        } else {
          // 发送请求时发生了错误
          return Promise.reject(new RequestError(`Error: ${error.message}`, -2))
        }
      }
    )
  }

  // 通用请求方法
  public async request<T = any>(
    config: AxiosRequestConfig
  ): Promise<IResponseData<T>> {
    try {
      const response = await this.instance.request<IResponseData<T>>(config)
      return response.data
    } catch (error) {
      if (error instanceof RequestError) {
        throw error
      }
      throw new RequestError('Unknown request error', -3, error)
    }
  }

  // GET 请求
  public async get<T = any>(
    url: string,
    params?: any,
    config?: AxiosRequestConfig
  ): Promise<IResponseData<T>> {
    return this.request<T>({
      method: 'GET',
      url,
      params,
      ...config,
    })
  }

  // POST 请求
  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<IResponseData<T>> {
    return this.request<T>({
      method: 'POST',
      url,
      data,
      ...config,
    })
  }

  // PUT 请求
  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<IResponseData<T>> {
    return this.request<T>({
      method: 'PUT',
      url,
      data,
      ...config,
    })
  }

  // DELETE 请求
  public async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<IResponseData<T>> {
    return this.request<T>({
      method: 'DELETE',
      url,
      ...config,
    })
  }

  // PATCH 请求
  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<IResponseData<T>> {
    return this.request<T>({
      method: 'PATCH',
      url,
      data,
      ...config,
    })
  }
}

// 默认配置
const defaultConfig: AxiosRequestConfig = {
  baseURL: '/api',
  timeout: 100000,
  headers: {
    'Content-Type': 'application/json',
  },
}

// 创建请求实例
const request = new Request(defaultConfig)

export default request
