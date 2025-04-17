import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/alchemical-dictionaries/',   // ⬅ repo name between the slashes
});
