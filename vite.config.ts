import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // This 'define' block replaces variables in the browser code
    define: {
      // Prevents "process is not defined" error in the browser
      'process.env': {},
      // Specifically inject the API Key
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
    },
    // Ensure relative paths for assets (critical for Vercel/GitHub Pages sub-paths)
    base: './', 
    server: {
      port: 3000,
      open: true
    }
  };
});