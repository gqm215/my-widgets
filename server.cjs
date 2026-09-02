// 墨集 轻量 Web 服务器 — 用于 nexe 打包为 .exe
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8099;

// dist 目录就是打包后的静态资源
const DIST = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serve(req, res) {
  let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url.split('?')[0]);

  // SPA fallback: 非静态资源一律返回 index.html
  const ext = path.extname(filePath);
  if (!ext || !MIME[ext]) {
    filePath = path.join(DIST, 'index.html');
  }

  const mime = MIME[path.extname(filePath)] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

const server = http.createServer(serve);

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`墨集 已启动 — ${url}`);
  // 自动打开浏览器
  const cmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
    ? `open "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd, () => {});
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`端口 ${PORT} 已被占用，墨集可能已在运行。`);
    exec(`start "" "http://localhost:${PORT}"`, () => {});
  }
});
