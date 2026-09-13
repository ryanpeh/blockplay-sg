import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Explicitly expose only this browser credential, never all unprefixed env vars.
  // Static capture scripts continue to read VITE_GOOGLE_MAPS_API_KEY directly.
  const demo = loadEnv(mode, process.cwd(), 'GOOGLE_MAPS_DEMO_API_KEY').GOOGLE_MAPS_DEMO_API_KEY?.trim();
  return {
  plugins: [react()],
  server: { proxy: { '/api/adventure': 'http://127.0.0.1:3001' } },
  define: mode === 'sites' ? { 'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify('') } : demo ? { 'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(demo) } : {},
  build: {
    rollupOptions: {
      output: { manualChunks: { three: ['three'] } },
    },
  },
  };
});
