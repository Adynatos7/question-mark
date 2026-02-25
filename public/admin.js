const root = document.getElementById('admin-app');
const KEY_STORAGE = 'qm_admin_key';

const beliefMap = {
  chretien: 'Chretien',
  musulman: 'Musulman',
  bouddhiste: 'Bouddhiste',
  hindou: 'Hindou',
  athee_agnostique: 'Athee / Agnostique',
  new_age: 'New Age',
  prefere_pas_repondre: 'Je prefere ne pas repondre'
};

const beliefs = Object.keys(beliefMap);

const state = {
  key: sessionStorage.getItem(KEY_STORAGE) || '',
  target: '',
  belief: '',
  rows: [],
  total: 0,
  loading: false,
  error: ''
};

function esc(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-admin-key': state.key
  };
}

async function loadRows() {
  state.loading = true;
  state.error = '';
  render();

  try {
    const params = new URLSearchParams();
    if (state.target) params.set('target', state.target);
    if (state.belief) params.set('belief', state.belief);

    const res = await fetch(`/api/admin/questions?${params.toString()}`, {
      method: 'GET',
      headers: buildHeaders()
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Erreur API admin');

    state.rows = body.rows || [];
    state.total = body.total || 0;
  } catch (err) {
    state.error = err.message;
    state.rows = [];
    state.total = 0;
  } finally {
    state.loading = false;
    render();
  }
}

async function removeRow(id) {
  if (!confirm('Supprimer cette question ?')) return;

  try {
    const res = await fetch(`/api/admin/questions?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: buildHeaders()
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Suppression impossible');

    await loadRows();
  } catch (err) {
    state.error = err.message;
    render();
  }
}

function logout() {
  state.key = '';
  sessionStorage.removeItem(KEY_STORAGE);
  state.rows = [];
  state.total = 0;
  state.error = '';
  render();
}

function renderLogin() {
  root.innerHTML = `
    <main class="admin-wrap">
      <section class="panel">
        <h1 class="step-title">Question Mark Admin</h1>
        <p class="admin-muted">Interface privee non liee au site public.</p>
        <label class="label" for="admin-key">Cle admin</label>
        <input id="admin-key" type="password" placeholder="Colle ta cle ADMIN_DASH_KEY" />
        <div class="admin-actions">
          <button class="primary" data-action="connect">Se connecter</button>
        </div>
      </section>
    </main>
  `;

  root.querySelector('[data-action="connect"]').addEventListener('click', () => {
    const key = root.querySelector('#admin-key').value.trim();
    if (!key) return;
    state.key = key;
    sessionStorage.setItem(KEY_STORAGE, key);
    loadRows();
  });
}

function renderAdmin() {
  root.innerHTML = `
    <main class="admin-wrap">
      <section class="panel">
        <h1 class="step-title">Question Mark Admin</h1>
        <p class="admin-muted">Gestion privee des questions (Netlify Blobs).</p>

        <div class="admin-top">
          <select id="target">
            <option value="">Toutes les cibles</option>
            <option value="god" ${state.target === 'god' ? 'selected' : ''}>Question a Dieu</option>
            <option value="devil" ${state.target === 'devil' ? 'selected' : ''}>Question au diable</option>
          </select>

          <select id="belief">
            <option value="">Toutes les croyances</option>
            ${beliefs.map((b) => `<option value="${b}" ${state.belief === b ? 'selected' : ''}>${beliefMap[b]}</option>`).join('')}
          </select>

          <button class="primary" data-action="filter">Filtrer</button>
          <button class="ghost" data-action="refresh">Rafraichir</button>
          <button class="ghost" data-action="logout">Deconnexion</button>
        </div>

        <p class="admin-muted">Total base: ${state.total} | Affiches: ${state.rows.length}</p>
        ${state.error ? `<p class="error">${esc(state.error)}</p>` : ''}
        ${state.loading ? '<p>Chargement...</p>' : ''}

        <div class="admin-list">
          ${!state.loading && state.rows.length === 0 ? '<p>Aucune question.</p>' : ''}
          ${state.rows.map((q) => {
            const who = q.target === 'god' ? 'Question a Dieu' : 'Question au diable';
            return `
              <article class="question-card ${q.target}">
                <p>${esc(q.questionText)}</p>
                <p class="meta">
                  ${who} | Nom: ${q.name ? esc(q.name) : 'Anonyme'} |
                  Age: ${q.age || 'Non precise'} |
                  Croyance: ${beliefMap[q.belief] || q.belief} |
                  ID: ${esc(q.id)} |
                  Date: ${new Date(q.createdAt).toLocaleString('fr-FR')}
                </p>
                <div class="admin-actions">
                  <button class="ghost small" data-delete-id="${esc(q.id)}">Supprimer</button>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      </section>
    </main>
  `;

  root.querySelector('[data-action="filter"]').addEventListener('click', () => {
    state.target = root.querySelector('#target').value;
    state.belief = root.querySelector('#belief').value;
    loadRows();
  });

  root.querySelector('[data-action="refresh"]').addEventListener('click', loadRows);
  root.querySelector('[data-action="logout"]').addEventListener('click', logout);

  root.querySelectorAll('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', () => removeRow(btn.getAttribute('data-delete-id')));
  });
}

function render() {
  if (!state.key) return renderLogin();
  return renderAdmin();
}

render();
if (state.key) loadRows();