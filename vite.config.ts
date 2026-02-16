import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000', // Point to your backend
        changeOrigin: true,
        secure: false,
        // ❌ DELETE THIS LINE IF IT EXISTS:
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
