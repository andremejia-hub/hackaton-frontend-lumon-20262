import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execFileSync } from 'node:child_process';
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  define: { __BUILD__: JSON.stringify(command === 'serve' ? 'dev' : execFileSync('git', ['-c', 'safe.directory=' + process.cwd().replaceAll('\\', '/'), 'rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8' }).trim()) },
}));
