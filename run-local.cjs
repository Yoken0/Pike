#!/usr/bin/env node

// CommonJS version - Simple script to run Pike locally on macOS/Windows/Linux
const { spawn } = require('child_process');

console.log('🚀 Starting Pike locally...\n');

// Set environment for local development
const devProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

devProcess.on('error', (error) => {
  console.error('❌ Failed to start Pike:', error.message);
  process.exit(1);
});

devProcess.on('close', (code) => {
  if (code !== 0) {
    console.log(`❌ Pike stopped with exit code ${code}`);
  }
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping Pike...');
  devProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  devProcess.kill('SIGTERM');
});