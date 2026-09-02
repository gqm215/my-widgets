// pack-step1: 复制 node.exe 作为墨集.exe
const fs = require('fs');
fs.mkdirSync('release', { recursive: true });
fs.copyFileSync(process.execPath, 'release/墨集.exe');
console.log('Copied node.exe -> release/墨集.exe');
