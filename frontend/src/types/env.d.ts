/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API Configuration
  readonly VITE_API_URL: string;

  // OAuth Configuration
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_MICROSOFT_CLIENT_ID: string;

  // Application Configuration
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_VERSION?: string;

  // Feature Flags
  readonly VITE_ENABLE_FILE_UPLOAD?: string;
  readonly VITE_MAX_FILE_SIZE?: string;

  // UI Configuration
  readonly VITE_PRIMARY_COLOR?: string;
  readonly VITE_SECONDARY_COLOR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}



