// src/env.d.ts 或 vite-env.d.ts
interface ImportMetaEnv {
  // 在这里声明自定义环境变量的类型（可选）
  readonly VITE_API_URL: string
  // 其他自定义变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
