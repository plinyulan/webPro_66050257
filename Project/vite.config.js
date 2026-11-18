import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // ให้ frontend เรียก /api/... แล้ว proxy ไปที่เซิร์ฟเวอร์ (พอร์ต 3001)
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
    watch: { ignored: ['**/server/**'] },
  },
  test: { environment: 'node' },
});
