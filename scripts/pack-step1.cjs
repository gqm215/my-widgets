// pack-step1: 复制 node.exe 作为 release/墨集.exe（路径基于仓库根目录）
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const releaseDir = path.join(ROOT, 'release');

fs.mkdirSync(releaseDir, { recursive: true });
fs.copyFileSync(process.execPath, path.join(releaseDir, '墨集.exe'));
console.log('Copied node.exe -> release/墨集.exe');
