import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    console.log('Vite loaded environment variables:', env);
    return {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'), // '@' が 'src' フォルダを指すように設定
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'recharts': ['recharts'],
              'firebase-app': ['firebase/app'],
              'firebase-auth': ['firebase/auth'],
              'firebase-firestore': ['firebase/firestore']
            }
          }
        }
      }
    };
});
