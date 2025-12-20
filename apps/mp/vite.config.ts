import { defineConfig } from 'vite';

export default defineConfig(async () => {
  const mod: any = await import('@dcloudio/vite-plugin-uni');
  const uni = (mod?.default?.default ?? mod?.default ?? mod) as () => any;
  return { plugins: [uni()] };
});
