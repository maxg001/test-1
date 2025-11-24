import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Explicitly define process.env to prevent "process is not defined" errors
      // while safely injecting the API Key.
      'process.env': {
        API_KEY: env.API_KEY,
        NODE_ENV: mode
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
    },
    base: './', 
    server: {
      port: 3000,
      open: true
    }
  };
});