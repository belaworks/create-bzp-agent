#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find tsx in node_modules
const findTsx = () => {
  const rootDir = join(__dirname, '..');
  const localTsx = join(rootDir, 'node_modules', '.bin', 'tsx');
  
  if (existsSync(localTsx)) {
    return localTsx;
  }
  
  // Fallback: try to use tsx from PATH
  return 'tsx';
};

const tsxPath = findTsx();
const scriptPath = join(__dirname, '..', 'index.ts');
const args = process.argv.slice(2);

// Use spawn with shell: true to handle PATH resolution better
const child = spawn(tsxPath, [scriptPath, ...args], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Error running CLI:', err.message);
  console.error('\nMake sure dependencies are installed. Run: npm install');
  process.exit(1);
});

