/**
 * 发版镜像同步脚本：把 GitHub Release 产物对齐到本地 moji/release/<tag>/。
 *
 * 用法：node scripts/release-sync.cjs
 * 每次发版（tag 推送、CI 构建完成后）跑一次。幂等：
 * - 本地已存在且大小与远端一致的文件自动跳过，只补缺失/损坏项
 * - 顺带把 release 根目录上 electron-builder 产出的带版本号文件
 *   （moji-<ver>-electron.exe / 墨集-<ver>.exe）归入对应的 v<ver>/ 子目录
 *
 * 目录约定（STATE.md 目录规整规约第 ⑥ 条）：本地保留最新版 + 全部历史版，
 * 与 GitHub Release 互为备份；win-unpacked / builder-debug.yml 属上一次构建的
 * 过程产物，留在 release 根不动。
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'release');
const REPO = 'gqm215/my-widgets';

const releases = JSON.parse(
  execSync(`curl -s https://api.github.com/repos/${REPO}/releases`, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
);

let ok = 0, skip = 0, fail = 0;

for (const rel of releases) {
  const dir = path.join(ROOT, rel.tag_name);
  fs.mkdirSync(dir, { recursive: true });
  for (const a of rel.assets) {
    const dest = path.join(dir, a.name);
    if (fs.existsSync(dest) && fs.statSync(dest).size === a.size) {
      console.log(`SKIP  ${rel.tag_name}/${a.name} (已存在且大小一致)`);
      skip++;
      continue;
    }
    try {
      execSync(`curl -sL --retry 3 -o "${dest}" "${a.browser_download_url}"`, {
        stdio: 'ignore',
        timeout: 600000,
      });
      const sz = fs.existsSync(dest) ? fs.statSync(dest).size : 0;
      if (sz === a.size) { console.log(`OK    ${rel.tag_name}/${a.name} (${(sz / 1048576).toFixed(1)} MB)`); ok++; }
      else { console.log(`FAIL  ${rel.tag_name}/${a.name} 大小不符 ${sz}/${a.size}`); fail++; }
    } catch (e) {
      console.log(`FAIL  ${rel.tag_name}/${a.name} ${e.message.slice(0, 80)}`);
      fail++;
    }
  }
}

// 归档 sweep：release 根上 electron-builder 直接落盘的带版本产物 → v<ver>/ 子目录
for (const name of fs.readdirSync(ROOT)) {
  const full = path.join(ROOT, name);
  if (!fs.statSync(full).isFile()) continue;
  const m = name.match(/(\d+\.\d+\.\d+)/);
  if (!m) continue;
  const dir = path.join(ROOT, `v${m[1]}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.renameSync(full, path.join(dir, name));
  console.log(`MOVE  ${name} -> v${m[1]}/`);
}

console.log(`\n汇总: 下载成功 ${ok} / 跳过 ${skip} / 失败 ${fail}`);
