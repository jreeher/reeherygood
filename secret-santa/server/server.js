// Tiny lock server for Krampus's Dungeon (Secret Santa).
// Remembers which players have already revealed their name, so it only shows once.
// Also keeps the Mrs Claus leaderboard (in its own file).
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

// ---------- Mrs Claus leaderboard (separate file; never touches the locks) ----------
// Floors 1-20 = farthest floor reached. 21 = cleared all 20.
const SCORES = path.join(dataDir, 'scores.json');
const MAX_FLOOR = 21;
let scores = { best: {}, runs: {} };
try { scores = Object.assign(scores, JSON.parse(fs.readFileSync(SCORES, 'utf8'))); } catch (e) {}
const saveScores = () => fs.writeFileSync(SCORES, JSON.stringify(scores));
const board = () => Object.entries(scores.best).map(([name, b]) => ({ name, floor: b.floor, at: b.at }))
  .sort((a, b) => b.floor - a.floor || a.at - b.at);

app.get('/leaderboard', (req, res) => res.json({ top: board() }));

// Honor system with a light check: each run must climb one floor at a time.
app.post('/score', (req, res) => {
  const { name, run, floor } = req.body || {};
  if (!PLAYERS.includes(name)) return res.status(400).json({ error: 'unknown player' });
  if (typeof run !== 'string' || !/^[a-z0-9]{8,32}$/i.test(run)) return res.status(400).json({ error: 'bad run' });
  if (!Number.isInteger(floor) || floor < 1 || floor > MAX_FLOOR) return res.status(400).json({ error: 'bad floor' });
  const r = scores.runs[run];
  if (!r && floor !== 1) return res.status(409).json({ error: 'runs start on floor 1' });
  if (r && r.name !== name) return res.status(409).json({ error: 'run belongs to someone else' });
  if (r && floor > r.floor + 1) return res.status(409).json({ error: 'skipped a floor', last: r.floor });
  if (!r || floor > r.floor){
    scores.runs[run] = { name, floor, t: Date.now() };
    const ids = Object.keys(scores.runs);   // keep the run list small
    if (ids.length > 300) ids.sort((a, b) => scores.runs[a].t - scores.runs[b].t).slice(0, ids.length - 300).forEach(id => delete scores.runs[id]);
    const b = scores.best[name];
    if (!b || floor > b.floor) scores.best[name] = { floor, at: Date.now() };
    saveScores();
  }
  res.json({ ok: true, top: board() });
});

// Organizer only: unlock one player ({"name":"Jake"}) or everyone ({}).
app.post('/reset', (req, res) => {
  if (!RESET_TOKEN || req.get('X-Reset-Token') !== RESET_TOKEN) return res.status(403).json({ error: 'nope' });
  const name = req.body && req.body.name;
  if (name) locked.delete(name); else locked.clear();
  save();
  res.json({ ok: true, locked: [...locked] });
});

// Organizer only: wipe the leaderboard (does not touch the locks).
app.post('/reset-scores', (req, res) => {
  if (!RESET_TOKEN || req.get('X-Reset-Token') !== RESET_TOKEN) return res.status(403).json({ error: 'nope' });
  scores = { best: {}, runs: {} }; saveScores();
  res.json({ ok: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Secret Santa lock server on :${port}, data in ${FILE}`));
