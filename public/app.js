const app = document.getElementById('app');

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

let state = {
  route: 'home',
  target: null,
  step: 1,
  form: {
    name: '',
    age: '',
    belief: 'prefere_pas_repondre',
    questionText: ''
  },
  filters: {
    target: '',
    belief: ''
  },
  questions: [],
  loading: false,
  error: ''
};

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setRoute(route) {
  state.route = route;
  render();
}

function startFlow(target) {
  state.target = target;
  state.step = 1;
  state.error = '';
  state.form = {
    name: '',
    age: '',
    belief: 'prefere_pas_repondre',
    questionText: ''
  };
  setRoute('flow');
}

function nextStep() {
  state.error = '';

  if (state.step === 2 && !beliefs.includes(state.form.belief)) {
    state.error = 'Merci de choisir une croyance.';
    return render();
  }

  if (state.step === 3) {
    const len = state.form.questionText.trim().length;
    if (len < 8 || len > 1200) {
      state.error = 'Votre question doit contenir entre 8 et 1200 caracteres.';
      return render();
    }
    return submitQuestion();
  }

  state.step += 1;
  render();
}

function skipIdentity() {
  state.form.name = '';
  state.form.age = '';
  state.step = 2;
  state.error = '';
  render();
}

async function submitQuestion() {
  state.loading = true;
  state.error = '';
  render();

  try {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: state.target,
        name: state.form.name,
        age: state.form.age,
        belief: state.form.belief,
        questionText: state.form.questionText
      })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Envoi impossible.');
    }

    state.step = 4;
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
}

async function loadDirectory() {
  state.loading = true;
  state.error = '';
  render();

  try {
    const params = new URLSearchParams();
    if (state.filters.target) params.set('target', state.filters.target);
    if (state.filters.belief) params.set('belief', state.filters.belief);

    const res = await fetch(`/api/questions?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Chargement impossible.');
    }

    state.questions = await res.json();
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
}

function openDirectory() {
  state.filters = { target: '', belief: '' };
  state.questions = [];
  setRoute('directory');
  loadDirectory();
}

function updateField(key, value) {
  state.form[key] = value;
}

function updateFilter(key, value) {
  state.filters[key] = value;
}

function renderHome() {
  app.innerHTML = `
    <main class="container">
      <h1 class="home-logo">Question Mark</h1>
      <p class="subtitle">
        Ce site recueille des questions humaines et spirituelles, posees anonymement ou non,
        afin d'observer ce que les personnes se demandent sur Dieu, le diable et le sens de la vie.
        Les donnees sont utilisees dans un cadre statistique et de reflexion collective.
      </p>

      <section class="panel">
        <div class="actions">
          <button class="primary" data-action="to-god">Question a Dieu</button>
          <button class="primary" data-action="to-devil">Question au diable</button>
          <button class="ghost" data-action="to-directory">Repertoire des questions</button>
        </div>
      </section>
    </main>
  `;

  app.querySelector('[data-action="to-god"]').addEventListener('click', () => startFlow('god'));
  app.querySelector('[data-action="to-devil"]').addEventListener('click', () => startFlow('devil'));
  app.querySelector('[data-action="to-directory"]').addEventListener('click', openDirectory);
}

function renderFlow() {
  const title = state.target === 'god' ? 'Question a Dieu' : 'Question au diable';
  const prompt = state.target === 'god'
    ? 'Si Dieu etait en face de vous, quelle question lui poseriez-vous ?'
    : 'Si le diable etait en face de vous, quelle question lui poseriez-vous ?';

  if (state.step === 1) {
    app.innerHTML = `
      <main class="container">
        <section class="panel">
          <h2 class="step-title">${title} - Etape 1/4</h2>
          <p>Quel est votre nom ? (facultatif) Quel est votre age ? (facultatif)</p>
          <div class="row">
            <div>
              <label class="label" for="name">Nom</label>
              <input id="name" maxlength="80" placeholder="Exemple: Sarah" value="${escapeHtml(state.form.name)}" />
            </div>
            <div>
              <label class="label" for="age">Age</label>
              <input id="age" type="number" min="5" max="120" placeholder="Exemple: 27" value="${escapeHtml(state.form.age)}" />
            </div>
          </div>
          <div class="actions">
            <button class="primary" data-action="next">Valider</button>
            <button class="ghost" data-action="skip">Passer cette etape</button>
            <button class="ghost" data-action="home">Retour accueil</button>
          </div>
          ${state.error ? `<div class="error">${escapeHtml(state.error)}</div>` : ''}
        </section>
      </main>
    `;

    const nameInput = app.querySelector('#name');
    const ageInput = app.querySelector('#age');

    nameInput.addEventListener('input', (e) => updateField('name', e.target.value));
    ageInput.addEventListener('input', (e) => updateField('age', e.target.value));
    app.querySelector('[data-action="next"]').addEventListener('click', nextStep);
    app.querySelector('[data-action="skip"]').addEventListener('click', skipIdentity);
    app.querySelector('[data-action="home"]').addEventListener('click', () => setRoute('home'));
    return;
  }

  if (state.step === 2) {
    app.innerHTML = `
      <main class="container">
        <section class="panel">
          <h2 class="step-title">${title} - Etape 2/4</h2>
          <label class="label" for="belief">Quelle est votre croyance ?</label>
          <select id="belief">
            ${beliefs.map((value) => `<option value="${value}" ${state.form.belief === value ? 'selected' : ''}>${beliefMap[value]}</option>`).join('')}
          </select>
          <div class="actions">
            <button class="primary" data-action="next">Continuer</button>
            <button class="ghost" data-action="back">Retour</button>
          </div>
          ${state.error ? `<div class="error">${escapeHtml(state.error)}</div>` : ''}
        </section>
      </main>
    `;

    app.querySelector('#belief').addEventListener('change', (e) => updateField('belief', e.target.value));
    app.querySelector('[data-action="next"]').addEventListener('click', nextStep);
    app.querySelector('[data-action="back"]').addEventListener('click', () => {
      state.step = 1;
      render();
    });
    return;
  }

  if (state.step === 3) {
    const length = state.form.questionText.length;

    app.innerHTML = `
      <main class="container">
        <section class="panel">
          <h2 class="step-title">${title} - Etape 3/4</h2>
          <p>${prompt}</p>
          <textarea id="question" maxlength="1200" placeholder="Ecrivez votre question...">${escapeHtml(state.form.questionText)}</textarea>
          <div class="counter" id="question-counter">${length}/1200</div>
          <div class="actions">
            <button class="primary" data-action="send" ${state.loading ? 'disabled' : ''}>${state.loading ? 'Envoi...' : 'Envoyer la question'}</button>
            <button class="ghost" data-action="back">Retour</button>
          </div>
          ${state.error ? `<div class="error">${escapeHtml(state.error)}</div>` : ''}
        </section>
      </main>
    `;

    app.querySelector('#question').addEventListener('input', (e) => {
      updateField('questionText', e.target.value);
      const counter = app.querySelector('#question-counter');
      if (counter) counter.textContent = `${e.target.value.length}/1200`;
    });
    app.querySelector('[data-action="send"]').addEventListener('click', nextStep);
    app.querySelector('[data-action="back"]').addEventListener('click', () => {
      state.step = 2;
      render();
    });
    return;
  }

  app.innerHTML = `
    <main class="container">
      <section class="panel">
        <h2 class="step-title">Merci</h2>
        <p>
          Votre question a bien ete enregistree. Merci pour votre confiance.
          Vous pouvez revenir a l'accueil ou en poser une autre.
        </p>
        <div class="actions">
          <button class="primary" data-action="home">Revenir a l'accueil</button>
          <button class="ghost" data-action="again">Poser une autre question</button>
        </div>
      </section>
    </main>
  `;

  app.querySelector('[data-action="home"]').addEventListener('click', () => setRoute('home'));
  app.querySelector('[data-action="again"]').addEventListener('click', () => startFlow(state.target));
}

function renderDirectory() {
  app.innerHTML = `
    <main class="container">
      <section class="panel">
        <h2 class="step-title">Repertoire des questions</h2>

        <div class="toolbar">
          <select id="filter-target">
            <option value="">Toutes les cibles</option>
            <option value="god" ${state.filters.target === 'god' ? 'selected' : ''}>Question a Dieu</option>
            <option value="devil" ${state.filters.target === 'devil' ? 'selected' : ''}>Question au diable</option>
          </select>

          <select id="filter-belief">
            <option value="">Toutes les croyances</option>
            ${beliefs.map((value) => `<option value="${value}" ${state.filters.belief === value ? 'selected' : ''}>${beliefMap[value]}</option>`).join('')}
          </select>

          <button class="primary" data-action="apply">Filtrer</button>
          <button class="ghost" data-action="home">Accueil</button>
        </div>

        ${state.error ? `<div class="error">${escapeHtml(state.error)}</div>` : ''}

        <div class="card-list">
          ${state.loading ? '<p>Chargement...</p>' : ''}
          ${!state.loading && state.questions.length === 0 ? '<p>Aucune question pour ces filtres.</p>' : ''}
          ${state.questions.map((q) => {
            const who = q.target === 'god' ? 'Question a Dieu' : 'Question au diable';
            const meta = [
              who,
              q.name ? `Nom: ${escapeHtml(q.name)}` : 'Nom: Anonyme',
              q.age ? `Age: ${q.age}` : 'Age: Non precise',
              `Croyance: ${beliefMap[q.belief] || q.belief}`,
              `Le: ${new Date(q.createdAt).toLocaleString('fr-FR')}`
            ].join(' | ');

            return `
              <article class="question-card ${q.target}">
                <p>${escapeHtml(q.questionText)}</p>
                <div class="meta">${meta}</div>
              </article>
            `;
          }).join('')}
        </div>
      </section>
    </main>
  `;

  app.querySelector('[data-action="home"]').addEventListener('click', () => setRoute('home'));
  app.querySelector('[data-action="apply"]').addEventListener('click', () => {
    const targetValue = app.querySelector('#filter-target').value;
    const beliefValue = app.querySelector('#filter-belief').value;
    updateFilter('target', targetValue);
    updateFilter('belief', beliefValue);
    loadDirectory();
  });
}

function render() {
  if (state.route === 'home') return renderHome();
  if (state.route === 'flow') return renderFlow();
  return renderDirectory();
}

render();
