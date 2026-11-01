// pack-clean: 清理 SEA 打包产生的临时文件
// 注意：sea-config.json 是版本化配置模板，不再删除
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

['sea-prep.blob'].forEach((f) => {
  try {
    fs.unlinkSync(path.join(ROOT, f));
  } catch {}
});
console.log('Cleaned temp files');
