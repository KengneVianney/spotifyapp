/**
 * Kabod Music — Serveur de partage local WiFi
 * 
 * Permet aux appareils sur le même réseau de découvrir et télécharger
 * les musiques partagées via l'application.
 * 
 * Usage : node server/index.js
 * 
 * Configuration via variables d'environnement :
 *   PORT  (défaut: 4567)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4567;
const MUSIQUES_DIR = path.join(__dirname, '..', 'musiques');
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

// MIME types
const MIME = {
  '.mp3': 'audio/mpeg',
  '.json': 'application/json',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Fichier introuvable' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function getSongList() {
  const files = fs.readdirSync(MUSIQUES_DIR).filter(f => f.endsWith('.mp3'));
  return files.map((file, idx) => {
    const stats = fs.statSync(path.join(MUSIQUES_DIR, file));
    return {
      id: `local_${idx}`,
      fileName: file,
      displayName: file.replace(/\.mp3$/i, '').replace(/[_-]/g, ' '),
      sizeBytes: stats.size,
      sizeMb: (stats.size / (1024 * 1024)).toFixed(1),
    };
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = url.pathname;

  // CORS pour les requêtes depuis l'app mobile
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Liste des musiques disponibles
  if (route === '/api/songs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getSongList(), null, 2));
    return;
  }

  // Téléchargement d'un fichier MP3
  if (route.startsWith('/download/')) {
    const fileName = decodeURIComponent(route.slice('/download/'));
    const filePath = path.join(MUSIQUES_DIR, fileName);

    // Sécurité : empêcher le path traversal
    if (!filePath.startsWith(MUSIQUES_DIR)) {
      res.writeHead(403);
      res.end('Accès interdit');
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Fichier introuvable');
      return;
    }

    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    return;
  }

  // Page web d'interface
  if (route === '/' || route === '/index.html') {
    serveFile(res, path.join(__dirname, 'index.html'), 'text/html');
    return;
  }

  res.writeHead(404);
  res.end('Route inconnue');
});

server.listen(PORT, '0.0.0.0', () => {
  const songs = getSongList();
  console.log(`
╔══════════════════════════════════════════╗
║        Kabod Music — Serveur WiFi       ║
╠══════════════════════════════════════════╣
║  Adresse : http://0.0.0.0:${PORT}         ║
║  Interface : http://localhost:${PORT}/     ║
║  Musiques disponibles : ${songs.length}            ║
║                                          ║
║  Sur ton téléphone, ouvre :              ║
║  http://<IP_DU_PC>:${PORT}                ║
╚══════════════════════════════════════════╝
  `);
});
