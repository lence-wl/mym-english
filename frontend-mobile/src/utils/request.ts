import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  AxiosError,
} from 'axios'

// 接口返回数据的通用结构
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

class Request {
  private instance: AxiosInstance
  private readonly options: AxiosRequestConfig

  constructor(options: AxiosRequestConfig = {}) {
    this.options = options
    this.instance = axios.create(options)
    this.setupInterceptors()
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token')
        if (token) {
          if (!config.headers?.Authorization) {
            config.headers.Authorization = `Bearer ${token}`
          }
        }
        return config
      },
      (error: AxiosError) => Promise.reject(error),
    )

    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response) {
          const { status, data } = error.response
          return Promise.reject(
            new RequestError(
              `Request failed with status code ${status}`,
              status,
              data,
            ),
          )
        } else if (error.request) {
          return Promise.reject(
            new RequestError('No response received from server', -1),
          )
        }
        return Promise.reject(new RequestError(`Error: ${error.message}`, -2))
      },
    )
  }

  public async request<T = any>(
    config: AxiosRequestConfig,
  ): Promise<IResponseData<T>> {
    try {
      const response = await this.instance.request<IResponseData<T>>(config)
      return response.data
    } catch (error) {
      if (error instanceof RequestError) throw error
      throw new RequestError('Unknown request error', -3, error)
    }
  }

  public get<T = any>(
    url: string,
    params?: any,
    config?: AxiosRequestConfig,
  ): Promise<IResponseData<T>> {
    return this.request<T>({ method: 'GET', url, params, ...config })
  }

  public post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<IResponseData<T>> {
    return this.request<T>({ method: 'POST', url, data, ...config })
  }

  public put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<IResponseData<T>> {
    return this.request<T>({ method: 'PUT', url, data, ...config })
  }

  public delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<IResponseData<T>> {
    return this.request<T>({ method: 'DELETE', url, ...config })
  }

  public patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<IResponseData<T>> {
    return this.request<T>({ method: 'PATCH', url, data, ...config })
  }
}

const request = new Request({
  baseURL: '/api',
  timeout: 100000,
  headers: { 'Content-Type': 'application/json' },
})

export default request