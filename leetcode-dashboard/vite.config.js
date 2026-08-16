import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/LeetcodeTracker/' : '/',
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/.vs/**'],
    },
  },
})