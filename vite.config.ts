import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Đây là phần quan trọng
    proxy: {
      // KHÔNG proxy /api, để Vercel tự xử lý nó
      // Nếu bạn có dòng '/api': { ... } ở đây, hãy XÓA nó đi
    }
  }
});