import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '../..');

const PORT = Number(process.env.PACKIT_PREVIEW_PORT || process.env.PORT || 8088);
const HOST = process.env.PACKIT_PREVIEW_HOST || '0.0.0.0';
const STATIC_ROOT = path.resolve(process.env.PACKIT_STATIC_ROOT || DEFAULT_ROOT);
const API_TARGET = process.env.PACKIT_API_TARGET || 'http://127.0.0.1:8090';

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.wasm', 'application/wasm'],
]);

const server = http.createServer(async (req, res) => {
  try {
    if ((req.url || '').startsWith('/api/') || req.url === '/health-api') {
      return proxyApi(req, res);
    }
    return serveStatic(req, res);
  } catch (error) {
    console.error('[packit-preview-gateway] error', error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Internal server error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[packit-preview-gateway] static=${STATIC_ROOT}`);
  console.log(`[packit-preview-gateway] api=${API_TARGET}`);
  console.log(`[packit-preview-gateway] listening on ${HOST}:${PORT}`);
});

function proxyApi(req, res) {
  const targetUrl = new URL(req.url === '/health-api' ? '/health' : req.url, API_TARGET);
  const upstreamReq = http.request(targetUrl, {
    method: req.method,
    headers: filterProxyHeaders(req.headers),
  }, upstreamRes => {
    const headers = { ...upstreamRes.headers };
    headers['access-control-allow-origin'] = '*';
    headers['cache-control'] = 'no-store';
    res.writeHead(upstreamRes.statusCode || 502, headers);
    upstreamRes.pipe(res);
  });

  upstreamReq.on('error', error => {
    console.error('[packit-preview-gateway] api proxy error', error.message);
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: false, error: 'api_proxy_error' }));
  });

  req.pipe(upstreamReq);
}

function serveStatic(req, res) {
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
    res.writeHead(405, { 'Allow': 'GET, HEAD' });
    return res.end();
  }

  const requestPath = decodeRequestPath(req.url || '/');
  const relativePath = normalizeRelativePath(requestPath);
  let filePath = path.resolve(STATIC_ROOT, relativePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  if (isDirectory(filePath)) filePath = path.join(filePath, 'index.html');
  if (!fs.existsSync(filePath) && shouldFallbackToIndex(requestPath)) filePath = path.join(STATIC_ROOT, 'index.html');

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end('Not found');
  }

  const ext = path.extname(filePath).toLowerCase();
  const headers = {
    'Content-Type': MIME.get(ext) || 'application/octet-stream',
    'Cache-Control': cacheHeader(filePath),
  };
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(filePath).pipe(res);
}

function decodeRequestPath(rawUrl) {
  try {
    const url = new URL(rawUrl, 'http://127.0.0.1');
    return decodeURIComponent(url.pathname || '/');
  } catch (_) {
    return '/';
  }
}

function normalizeRelativePath(requestPath) {
  const cleaned = String(requestPath || '/').replace(/^\/+/, '');
  return cleaned || 'index.html';
}

function shouldFallbackToIndex(requestPath) {
  return !path.extname(requestPath || '') && !String(requestPath || '').startsWith('/api/');
}

function isDirectory(filePath) {
  try { return fs.statSync(filePath).isDirectory(); }
  catch (_) { return false; }
}

function cacheHeader(filePath) {
  const base = path.basename(filePath);
  if (base === 'index.html' || base === 'sw.js' || base === 'manifest.json') return 'no-cache';
  return 'public, max-age=3600';
}

function filterProxyHeaders(headers) {
  const copy = { ...headers };
  delete copy.host;
  delete copy.connection;
  delete copy['content-length'];
  return copy;
}

process.on('SIGTERM', () => {
  console.log('[packit-preview-gateway] SIGTERM');
  server.close(() => process.exit(0));
});
