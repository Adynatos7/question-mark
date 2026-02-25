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

function unauthorized() {
  return json(401, { error: 'Non autorise.' });
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

  return entries;
}

function isAuthorized(headers) {
  const expectedKey = process.env.ADMIN_DASH_KEY;
  if (!expectedKey) return false;

  const provided =
    headers['x-admin-key'] ||
    headers['X-Admin-Key'] ||
    headers.authorization?.replace(/^Bearer\s+/i, '');

  return provided === expectedKey;
}

exports.handler = async (event) => {
  if (!isAuthorized(event.headers || {})) {
    return unauthorized();
  }

  const store = getStore('questions_store', {
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN
  });

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

    return json(200, {
      total: entries.length,
      count: filtered.length,
      rows: filtered.slice(0, 1000)
    });
  }

  if (event.httpMethod === 'DELETE') {
    const id = event.queryStringParameters?.id;
    if (!id) {
      return json(400, { error: 'ID requis.' });
    }

    await store.delete(`q:${id}`);
    return json(200, { ok: true, id });
  }

  return json(405, { error: 'Methode non autorisee.' });
};