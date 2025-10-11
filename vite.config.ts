import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/subway-tracker/', // GitHub Pages 배포 시 레포지토리 이름
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
