declare const _default: import("vite").UserConfig;
export default _default;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}