const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const DB_PATH = path.join(__dirname, 'data', 'question_mark.db');

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target TEXT NOT NULL CHECK(target IN ('god', 'devil')),
      name TEXT,
      age INTEGER,
      belief TEXT NOT NULL,
      question_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const allowedBeliefs = [
  'chretien',
  'musulman',
  'bouddhiste',
  'hindou',
  'athee_agnostique',
  'new_age',
  'prefere_pas_repondre'
];

app.post('/api/questions', (req, res) => {
  const { target, name, age, belief, questionText } = req.body;

  if (!['god', 'devil'].includes(target)) {
    return res.status(400).json({ error: 'Cible invalide.' });
  }

  if (!allowedBeliefs.includes(belief)) {
    return res.status(400).json({ error: 'Croyance invalide.' });
  }

  if (typeof questionText !== 'string') {
    return res.status(400).json({ error: 'La question est requise.' });
  }

  const trimmedQuestion = questionText.trim();
  if (trimmedQuestion.length < 8 || trimmedQuestion.length > 1200) {
    return res.status(400).json({ error: 'La question doit contenir entre 8 et 1200 caracteres.' });
  }

  let parsedAge = null;
  if (age !== null && age !== undefined && age !== '') {
    const n = Number(age);
    if (!Number.isInteger(n) || n < 5 || n > 120) {
      return res.status(400).json({ error: 'Age invalide.' });
    }
    parsedAge = n;
  }

  const cleanName = typeof name === 'string' ? name.trim().slice(0, 80) : null;

  db.run(
    `INSERT INTO questions (target, name, age, belief, question_text) VALUES (?, ?, ?, ?, ?)`,
    [target, cleanName || null, parsedAge, belief, trimmedQuestion],
    function onInsert(err) {
      if (err) {
        return res.status(500).json({ error: 'Erreur base de donnees.' });
      }
      return res.status(201).json({ id: this.lastID });
    }
  );
});

app.get('/api/questions', (req, res) => {
  const { target, belief } = req.query;

  const conditions = [];
  const params = [];

  if (target && ['god', 'devil'].includes(target)) {
    conditions.push('target = ?');
    params.push(target);
  }

  if (belief && allowedBeliefs.includes(belief)) {
    conditions.push('belief = ?');
    params.push(belief);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT id, target, name, age, belief, question_text AS questionText, created_at AS createdAt
    FROM questions
    ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT 500
  `;

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur base de donnees.' });
    }
    return res.json(rows);
  });
});

app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port) {
  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Question Mark demarre sur http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && !process.env.PORT) {
      // eslint-disable-next-line no-console
      console.log(`Port ${port} occupe, tentative sur ${port + 1}...`);
      return startServer(port + 1);
    }

    // eslint-disable-next-line no-console
    console.error('Impossible de demarrer le serveur:', err.message);
    process.exit(1);
  });
}

startServer(DEFAULT_PORT);
