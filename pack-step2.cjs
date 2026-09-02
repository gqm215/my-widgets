// pack-step2: 复制 dist 到 release/dist
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'dist');
const dest = path.join(__dirname, 'release', 'dist');

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log('Copied dist -> release/dist');
