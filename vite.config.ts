import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/MT940-merger/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
