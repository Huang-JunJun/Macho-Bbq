import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

export default defineConfig(async ({ mode }) => {
  const envDir = dirname(fileURLToPath(import.meta.url));
  const env = loadEnv(mode, envDir, '');
  const injected = {
    MODE: mode,
    VITE_API_BASE_URL: env.VITE_API_BASE_URL,
    VITE_PUBLIC_BASE_URL: env.VITE_PUBLIC_BASE_URL,
    VITE_WS_BASE_URL: env.VITE_WS_BASE_URL,
    VITE_WS_URL: env.VITE_WS_URL
  };
  const mod: any = await import('@dcloudio/vite-plugin-uni');
  const uni = (mod?.default?.default ?? mod?.default ?? mod) as () => any;
  return {
    envDir,
    plugins: [uni()],
    define: {
      __MP_ENV__: JSON.stringify(injected)
    }
  };
});
