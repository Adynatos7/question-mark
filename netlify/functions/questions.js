const { randomUUID } = require('crypto');
const { getStore } = require('@netlify/blobs');

const allowedBeliefs = [
  'chretien',
  'musulman',
  'bouddhiste',
  'hindou',
  'athee_agnostique',
  'new_age',
  'prefere_pas_repondre'
];

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  };
}

function validateInput(body) {
  const { target, name, age, belief, questionText } = body || {};

  if (!['god', 'devil'].includes(target)) {
    return { error: 'Cible invalide.' };
  }

  if (!allowedBeliefs.includes(belief)) {
    return { error: 'Croyance invalide.' };
  }

  if (typeof questionText !== 'string') {
    return { error: 'La question est requise.' };
  }

  const trimmedQuestion = questionText.trim();
  if (trimmedQuestion.length < 8 || trimmedQuestion.length > 1200) {
    return { error: 'La question doit contenir entre 8 et 1200 caracteres.' };
  }

  let parsedAge = null;
  if (age !== null && age !== undefined && age !== '') {
    const n = Number(age);
    if (!Number.isInteger(n) || n < 5 || n > 120) {
      return { error: 'Age invalide.' };
    }
    parsedAge = n;
  }

  const cleanName = typeof name === 'string' ? name.trim().slice(0, 80) : null;

  return {
    value: {
      target,
      name: cleanName || null,
      age: parsedAge,
      belief,
      questionText: trimmedQuestion
    }
  };
}

async function listEntries(store) {
  const entries = [];
  let cursor;

  do {
    const page = await store.list({ prefix: 'q:', cursor });
    for (const blob of page.blobs) {
      const value = await store.get(blob.key, { type: 'json' });
      if (value) entries.push(value);
    }
    cursor = page.cursor;
  } while (cursor);

  entries.sort((a, b) => {
    if (a.createdAt === b.createdAt) return b.id.localeCompare(a.id);
    return b.createdAt.localeCompare(a.createdAt);
  });

  return entries.slice(0, 500);
}

exports.handler = async (event) => {
  const store = getStore('questions_store');

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { error: 'JSON invalide.' });
    }

    const checked = validateInput(body);
    if (checked.error) {
      return json(400, { error: checked.error });
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const payload = { id, createdAt, ...checked.value };

    await store.setJSON(`q:${id}`, payload);
    return json(201, { id });
  }

  if (event.httpMethod === 'GET') {
    const target = event.queryStringParameters?.target;
    const belief = event.queryStringParameters?.belief;

    const targetOk = !target || ['god', 'devil'].includes(target);
    const beliefOk = !belief || allowedBeliefs.includes(belief);

    if (!targetOk || !beliefOk) {
      return json(400, { error: 'Filtre invalide.' });
    }

    const entries = await listEntries(store);

    const filtered = entries.filter((item) => {
      if (target && item.target !== target) return false;
      if (belief && item.belief !== belief) return false;
      return true;
    });

    return json(200, filtered);
  }

  return json(405, { error: 'Methode non autorisee.' });
};