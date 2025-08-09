#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

const command = process.argv[2];

const scripts = {
  'dev': 'concurrently "npm run dev" "wait-on http://localhost:5000 && electron electron/main.js"',
  'build': 'npm run build && electron-builder --config electron-builder.config.js',
  'dist': 'npm run build && electron-builder --config electron-builder.config.js --publish=never'
};

if (!command || !scripts[command]) {
  console.log('Available commands:');
  console.log('  node build-desktop.js dev    - Run in development mode');
  console.log('  node build-desktop.js build  - Build desktop app');
  console.log('  node build-desktop.js dist   - Create distribution packages');
  process.exit(1);
}

console.log(`Running: ${scripts[command]}`);

const child = spawn(scripts[command], [], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

child.on('exit', (code) => {
  process.exit(code);
});