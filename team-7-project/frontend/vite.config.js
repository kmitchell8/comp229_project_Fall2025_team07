import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVER_PORT = 5000;
// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // Define ALL your HTML files here
        main: resolve(__dirname, 'index.html'), // Assuming index.html is in frontend/
        login: resolve(__dirname, 'login.html'), // Assuming login.html is in frontend/
        library: resolve(__dirname, 'library.html'),
        contact: resolve(__dirname, 'contact.html'),
        profile: resolve(__dirname, 'profile.html'),
        services: resolve(__dirname, 'services.html'),
        about: resolve(__dirname, 'about.html'),
        register: resolve(__dirname, 'register.html'),
        // Add all other pages here (e.g., about: resolve(__dirname, 'about.html'))
      },
    },
  },
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
