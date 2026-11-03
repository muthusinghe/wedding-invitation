import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import rsvp from './api/rsvp.js';
import login from './api/login.js';
import logout from './api/logout.js';
import guests from './api/guests.js';

const root = path.resolve('public');
const routes = {'/api/rsvp': rsvp, '/api/login': login, '/api/logout': logout, '/api/guests': guests};
const types = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.ics': 'text/calendar; charset=utf-8'};

function safeFile(pathname) {
  if (pathname.includes('\0') || pathname.includes('\\')) return null;
  const file = path.resolve(root, `.${pathname}`);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  return file;
}

async function serveStatic(res, pathname) {
  const candidates = pathname === '/' ? ['/index.html'] : [pathname];
  if (pathname !== '/' && !path.extname(pathname)) candidates.push(`${pathname}.html`);
  for (const candidate of candidates) {
    const file = safeFile(candidate);
    if (!file) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      const content = await readFile(file);
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.end(content);
      return;
    } catch { /* try the .html fallback */ }
  }
  res.writeHead(404);
  res.end('Not found');
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const handler = routes[pathname];
  if (handler) {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 8192) {
        res.writeHead(413);
        res.end();
        return;
      }
    }
    try { req.body = JSON.parse(raw || '{}'); }
    catch {
      res.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
      res.end('{"error":"Invalid request"}');
      return;
    }
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); };
    return handler(req, res);
  }
  try { return await serveStatic(res, decodeURIComponent(pathname)); }
  catch {
    res.writeHead(400);
    res.end();
  }
}).listen(3000, '127.0.0.1', () => console.log('Local: http://127.0.0.1:3000'));
