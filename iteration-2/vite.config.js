// vite.config.js  ─ root of iteration‑2
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './'          // makes all asset URLs relative for GitHub Pages
});
