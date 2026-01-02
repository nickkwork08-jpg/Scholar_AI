import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    base: '/',

    build: {
      outDir: 'dist',
      emptyOutDir: true
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

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    },

    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_API_KEY_1': JSON.stringify(env.VITE_API_KEY_1),
      'process.env.VITE_API_KEY_2': JSON.stringify(env.VITE_API_KEY_2),
      'process.env.VITE_API_KEY_3': JSON.stringify(env.VITE_API_KEY_3),
      'process.env.VITE_API_KEY_4': JSON.stringify(env.VITE_API_KEY_4),
      'process.env.VITE_API_KEY_5': JSON.stringify(env.VITE_API_KEY_5)
    }
  };
});
