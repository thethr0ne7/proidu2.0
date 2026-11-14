import { copyFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/assets', { recursive: true });
copyFileSync('index.html', 'dist/index.html');
cpSync('assets', 'dist/assets', { recursive: true });
console.log('dist ready');
