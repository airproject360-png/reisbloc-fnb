/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Variables de entorno de Firebase eliminadas tras migración a Supabase
  readonly VITE_MERCADOPAGO_PUBLIC_KEY: string
  readonly VITE_MERCADOPAGO_ACCESS_TOKEN: string
  readonly VITE_APP_ENV: string
  readonly VITE_APP_URL: string
  readonly VITE_LOG_LEVEL: string
  readonly VITE_SUPABASE_PRODUCT_BUCKET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
