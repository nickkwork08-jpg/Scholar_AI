import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/Scholar_AI/',
    build: {
      outDir: 'dist' // you can keep src/dist if you want, but dist is standard
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_API_KEY_1': JSON.stringify(env.VITE_API_KEY_1),
      'process.env.VITE_API_KEY_2': JSON.stringify(env.VITE_API_KEY_2),
      'process.env.VITE_API_KEY_3': JSON.stringify(env.VITE_API_KEY_3),
      'process.env.VITE_API_KEY_4': JSON.stringify(env.VITE_API_KEY_4),
      'process.env.VITE_API_KEY_5': JSON.stringify(env.VITE_API_KEY_5)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname),
        '@/components': path.resolve(__dirname, 'components'),
        '@/services': path.resolve(__dirname, 'services'),
      }
    }
  };
});
