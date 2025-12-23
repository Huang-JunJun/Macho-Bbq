import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

export default defineConfig(async () => {
  const envDir = dirname(fileURLToPath(import.meta.url));
  const mod: any = await import('@dcloudio/vite-plugin-uni');
  const uni = (mod?.default?.default ?? mod?.default ?? mod) as () => any;
  return { envDir, plugins: [uni()] };
});
