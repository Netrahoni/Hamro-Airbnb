import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    allowedHosts: true,
    // Dev-only proxy: routes /api to local backend on port 5000
    proxy:
      mode === 'development'
        ? {
            '/api': {
              target: 'http://localhost:5000',
              changeOrigin: true,
            },
          }
        : undefined,
  },
}));
