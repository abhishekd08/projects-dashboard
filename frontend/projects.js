const API_BASE = 'http://localhost:3000/api';

const listEl = document.getElementById('projects-list');
const newBtn = document.getElementById('new-project-btn');
const modal = document.getElementById('project-modal');
const closeModalBtn = document.getElementById('close-project-modal');
const form = document.getElementById('project-form');
const titleInput = document.getElementById('project-title');

const delModal = document.getElementById('delete-modal');
const delMsg = document.getElementById('delete-msg');
const delConfirmInput = document.getElementById('confirm-title');
const delConfirmBtn = document.getElementById('confirm-delete');
const delCloseBtn = document.getElementById('close-delete-modal');

let projects = [];
let projectToDelete = null;

async function fetchProjects() {
  const resp = await fetch(`${API_BASE}/projects`);
  projects = await resp.json();
  renderProjects();
}

function renderProjects() {
  listEl.innerHTML = '';
  projects.forEach(p => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <div class="project-left">
        <h3 class="project-title">${p.title}</h3>
        <span class="project-meta">Created ${new Date(p.createdAt).toLocaleString()}</span>
      </div>
      <div class="project-actions">
        <button class="btn open">Open</button>
        <button class="btn delete">Delete</button>
      </div>
    `;
    card.querySelector('.btn.open').addEventListener('click', () => openProject(card, p));
    card.querySelector('.btn.delete').addEventListener('click', () => confirmDelete(p));
    listEl.appendChild(card);
  });
}

function openProject(card, proj) {
  card.classList.add('swipe-left');
  setTimeout(() => {
    window.location.href = `index.html?project=${encodeURIComponent(proj.id)}`;
  }, 220);
}

function confirmDelete(proj) {
  projectToDelete = proj;
  delMsg.textContent = `Type "${proj.title}" to confirm deletion. This will delete all tasks in this project.`;
  delConfirmInput.value = '';
  delModal.classList.remove('hidden');
  // Focus the input automatically
  setTimeout(() => delConfirmInput.focus(), 0);
}

async function handleProjectDelete() {
  if (!projectToDelete) return;
  if (delConfirmInput.value !== projectToDelete.title) {
    alert('Confirmation title does not match');
    return;
  }
  try {
    const resp = await fetch(`${API_BASE}/projects/${projectToDelete.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmTitle: projectToDelete.title })
    });
    if (!resp.ok) {
      const e = await resp.json().catch(()=>({}));
      throw new Error(e.error || 'Delete failed');
    }
    projects = projects.filter(p => p.id !== projectToDelete.id);
    renderProjects();
  } catch (err) {
    alert(err.message);
  } finally {
    projectToDelete = null;
    delModal.classList.add('hidden');
  }
}

delConfirmBtn.addEventListener('click', handleProjectDelete);
delConfirmInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleProjectDelete();
  }
});

// Modal controls
newBtn.addEventListener('click', () => { modal.classList.remove('hidden'); titleInput.focus(); });
closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
delCloseBtn.addEventListener('click', () => delModal.classList.add('hidden'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
delModal.addEventListener('click', e => { if (e.target === delModal) delModal.classList.add('hidden'); });
window.addEventListener('keydown', e => { if (e.key === 'Escape') { modal.classList.add('hidden'); delModal.classList.add('hidden'); }});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) { alert('Title is required'); return; }
  try {
    const resp = await fetch(`${API_BASE}/projects`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ title }) });
    if (resp.status === 409) {
      alert('Project title must be unique');
      return;
    }
    if (!resp.ok) {
      const e = await resp.json().catch(()=>({}));
      throw new Error(e.error || 'Create failed');
    }
    const data = await resp.json();
    projects.push(data);
    renderProjects();
    titleInput.value = '';
    modal.classList.add('hidden');
  } catch (err) {
    alert(err.message);
  }
});

fetchProjects();
