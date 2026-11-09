import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the React app (5173) talks to the API (5000) through this proxy,
// so there are no CORS problems and image URLs like /uploads/x.jpg just work.
const API = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/uploads': API,
      '/sitemap.xml': API,
      '/rss.xml': API,
      '/socket.io': { target: API, ws: true },
    },
  },
});
