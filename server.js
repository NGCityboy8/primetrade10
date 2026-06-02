const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

app.use(express.json({ limit: '2mb' }));

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeJson(filePath, data) {
  ensureDataDir();
  const encoded = JSON.stringify(data, null, 2);
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, encoded, 'utf8');
  fs.renameSync(tmp, filePath);
}

app.post('/api', (req, res) => {
  const { action } = req.body || {};

  try {
    if (action === 'users.get') {
      return res.json({ ok: true, users: readJson(USERS_FILE) });
    }

    if (action === 'users.save') {
      const { users } = req.body;
      if (!Array.isArray(users)) {
        return res.status(400).json({ ok: false, error: 'Invalid users payload' });
      }
      writeJson(USERS_FILE, users);
      return res.json({ ok: true });
    }

    if (action === 'messages.add') {
      const { message } = req.body;
      if (!message || typeof message !== 'object') {
        return res.status(400).json({ ok: false, error: 'Invalid message payload' });
      }
      const messages = readJson(MESSAGES_FILE);
      messages.push(message);
      writeJson(MESSAGES_FILE, messages);
      return res.json({ ok: true });
    }

    if (action === 'messages.list') {
      return res.json({ ok: true, messages: readJson(MESSAGES_FILE) });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, storage: DATA_DIR });
});

app.use(express.static(ROOT, { extensions: ['html'] }));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const filePath = path.join(ROOT, req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  const htmlPath = `${filePath}.html`;
  if (fs.existsSync(htmlPath)) {
    return res.sendFile(htmlPath);
  }
  return res.status(404).send('Not found');
});

ensureDataDir();
app.listen(PORT, () => {
  console.log(`Prime Trade running on port ${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
