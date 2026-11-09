/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后台 API 路径前缀。生产挂在 /manager/ 目录时用 "/manager/api"。 */
  readonly VITE_API_PREFIX?: string;
  /** 静态资源根路径。生产挂在 /manager/ 目录时用 "/manager/"。 */
  readonly VITE_BASE_PATH?: string;
  /** 开发时 vite 代理的后端地址。 */
  readonly VITE_API_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
