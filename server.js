import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 8000;

// =========================================================================
// Zde můžete vložit svůj Concept2 Personal Access Token napevno pro vývoj:
// Např.: const HARDCODED_C2_TOKEN = '2|abc123xyz...';
// =========================================================================
const HARDCODED_C2_TOKEN = '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  // CORS hlavičky pro bezproblémové lokální volání
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // === PROXY ENDPOINT: Zjištění výchozího tokenu ze serveru ===
  if (req.url === '/api/logbook/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      hasServerToken: Boolean(HARDCODED_C2_TOKEN && HARDCODED_C2_TOKEN.trim()),
      token: HARDCODED_C2_TOKEN ? HARDCODED_C2_TOKEN.trim() : ''
    }));
    return;
  }

  // === PROXY ENDPOINT: Ověření Concept2 tokenu ===
  if (req.url === '/api/logbook/verify' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const token = (parsed.token && parsed.token.trim()) || HARDCODED_C2_TOKEN;
        if (!token) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Chybí token (není zadán v aplikaci ani v server.js)' }));
          return;
        }

        console.log(`[C2 Verify] Ověřuji token: ${token.substring(0, 6)}...`);
        const c2Res = await fetch('https://log.concept2.com/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.c2logbook.v1+json'
          }
        });

        const data = await c2Res.json();
        console.log(`[C2 Verify] Status: ${c2Res.status}, data:`, data);

        res.writeHead(c2Res.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err) {
        console.error('[C2 Verify] Chyba:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // === PROXY ENDPOINT: Odeslání tréninku do Logbooku ===
  if (req.url === '/api/logbook/results' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const token = (parsed.token && parsed.token.trim()) || HARDCODED_C2_TOKEN;
        const payload = parsed.payload;
        if (!token || !payload) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Chybí token nebo data tréninku' }));
          return;
        }

        console.log(`[C2 Upload] Odesílám payload:`, JSON.stringify(payload));

        // 1. Zkusíme POST na /api/users/me/results
        let c2Res = await fetch('https://log.concept2.com/api/users/me/results', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.c2logbook.v1+json'
          },
          body: JSON.stringify(payload)
        });

        let data = await c2Res.json();
        console.log(`[C2 Upload /users/me/results] Status: ${c2Res.status}, data:`, data);

        // 2. Pokud vrátí "User not found", zkusíme zjistit přesné user ID z /api/users/me a poslat na /api/users/{id}/results
        if (!c2Res.ok && (data.message === 'User not found' || c2Res.status === 404)) {
          console.log(`[C2 Upload] /users/me/results vrátilo "User not found". Zjišťuji ID uživatele...`);
          try {
            const userRes = await fetch('https://log.concept2.com/api/users/me', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.c2logbook.v1+json'
              }
            });
            const userData = await userRes.json();
            console.log(`[C2 Upload] /api/users/me odpověď:`, userData);
            
            const userId = userData?.data?.id;
            if (userId) {
              console.log(`[C2 Upload] Zkouším poslat na /api/users/${userId}/results...`);
              c2Res = await fetch(`https://log.concept2.com/api/users/${userId}/results`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/vnd.c2logbook.v1+json'
                },
                body: JSON.stringify(payload)
              });
              data = await c2Res.json();
              console.log(`[C2 Upload /users/${userId}/results] Status: ${c2Res.status}, data:`, data);
            }
          } catch (retryErr) {
            console.error(`[C2 Upload] Chyba při pokusu o zjištění ID:`, retryErr);
          }
        }

        res.writeHead(c2Res.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err) {
        console.error('[C2 Upload] Kritická chyba:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // === STATICKÉ SOUBORY ===
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});

