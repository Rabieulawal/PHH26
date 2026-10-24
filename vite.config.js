import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
        register: resolve(projectRoot, 'register.html'),
      },
    },
  },
});
