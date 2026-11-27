// Tiny lock server for Krampus's Dungeon (Secret Santa).
// Remembers which players have already revealed their name, so it only shows once.
const express = require('express');
const fs = require('fs');
const path = require('path');

const PLAYERS = ['David', 'Juli', 'Jordan', 'Erin', 'Dick', 'Dawn', 'Chelsea', 'Jake'];
const ALLOWED = (process.env.ALLOWED_ORIGINS || 'https://invert-able.com,https://www.invert-able.com').split(',').map(s => s.trim());
const RESET_TOKEN = process.env.RESET_TOKEN || '';

let dataDir = process.env.DATA_DIR || '/data';
try { fs.mkdirSync(dataDir, { recursive: true }); fs.accessSync(dataDir, fs.constants.W_OK); }
catch (e) { dataDir = path.join(__dirname, 'data'); fs.mkdirSync(dataDir, { recursive: true }); }
const FILE = path.join(dataDir, 'locks.json');

let locked = new Set();
try { locked = new Set(JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) {}
const save = () => fs.writeFileSync(FILE, JSON.stringify([...locked]));

const app = express();
app.use(express.json({ limit: '1kb' }));
app.use((req, res, next) => {
  const o = req.headers.origin;
  if (o && ALLOWED.includes(o)) { res.set('Access-Control-Allow-Origin', o); res.set('Vary', 'Origin'); }
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Reset-Token');
  res.set('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/', (req, res) => res.json({ ok: true, locked: locked.size }));
app.get('/locks', (req, res) => res.json({ locked: [...locked] }));

// First call for a name wins (200). Every later call gets 409.
app.post('/lock', (req, res) => {
  const name = req.body && req.body.name;
  if (!PLAYERS.includes(name)) return res.status(400).json({ error: 'unknown player' });
  if (locked.has(name)) return res.status(409).json({ error: 'already revealed' });
  locked.add(name); save();
  res.json({ ok: true });
});

// Organizer only: unlock one player ({"name":"Jake"}) or everyone ({}).
app.post('/reset', (req, res) => {
  if (!RESET_TOKEN || req.get('X-Reset-Token') !== RESET_TOKEN) return res.status(403).json({ error: 'nope' });
  const name = req.body && req.body.name;
  if (name) locked.delete(name); else locked.clear();
  save();
  res.json({ ok: true, locked: [...locked] });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Secret Santa lock server on :${port}, data in ${FILE}`));
