import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/alchemical-dictionaries/iteration-2/',   // ⬅ repo name between the slashes
});
