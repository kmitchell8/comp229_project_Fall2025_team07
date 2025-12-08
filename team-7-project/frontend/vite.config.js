import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const SERVER_PORT = 5000;
// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    proxy: {
      // Proxy requests starting with '/api' to the backend server
      '/api': {
        target: `http://localhost:${SERVER_PORT}`,
        // essential for backend to correctly interpret the host and protocol
        changeOrigin: true, 
        // optional: rewrites the path if you don't want the '/api' prefix
        // rewrite: (path) => path.replace(/^\/api/, ''), 
      },
    },
  },
})
