// pack-clean: 清理临时文件
const fs = require('fs');
['sea-prep.blob', 'sea-config.json'].forEach(f => {
  try { fs.unlinkSync(f); } catch {}
});
console.log('Cleaned temp files');
