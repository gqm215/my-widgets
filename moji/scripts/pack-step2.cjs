// pack-step2: 复制 dist 到 release/dist
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = path.join(ROOT, 'dist');
const dest = path.join(ROOT, 'release', 'dist');

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log('Copied dist -> release/dist');
