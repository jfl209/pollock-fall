import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  base: '/pollock-fall/',
  plugins: [glsl({ compress: false })],
});
