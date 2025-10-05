const API_URL = 'http://localhost:3000/api/tasks';

let tasks = [];
let filterTags = new Set();

const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const closeModalBtn = document.getElementById('close-modal');
const tagFilterSelect = document.getElementById('tag-filter');
const clearFilterBtn = document.getElementById('clear-filter');
const globalAddBtn = document.getElementById('global-add-btn');
const filterOpenBtn = document.getElementById('filter-open-btn');
const filterModal = document.getElementById('filter-modal');
const closeFilterBtn = document.getElementById('close-filter');
const startDateInput = document.getElementById('task-start-date');
const startTimeInput = document.getElementById('task-start-time');
const completedRow = document.getElementById('task-completed-row');
const completedAtEl = document.getElementById('task-completed-at');

// Initialize a simpler date picker for start date (Pikaday)
if (startDateInput) {
  new Pikaday({
    field: startDateInput,
    format: 'YYYY-MM-DD',
    toString(date) { return moment(date).format('YYYY-MM-DD'); },
    parse(dateString) { return moment(dateString, 'YYYY-MM-DD').toDate(); }
  });
}

// Utility functions
function createTaskElement(task) {
  const card = document.createElement('div');
  card.className = 'task-card ' + task.priority.toLowerCase();
  card.draggable = true;
  card.dataset.id = task.id;

  // Small view by default (title and priority glyph)
  card.innerHTML = `
    <p class="task-title">${task.title}</p>
    ${priorityGlyph(task.priority)}
    ${task.status === 'done' && task.end ? `<div style="margin-top:6px;color:#5e6c84;font-size:12px;">Completed ${task.end}</div>` : ''}
  `;

  // Open detail modal instead of expanding
  card.addEventListener('click', () => openTaskModal(task));

  // Drag and drop handlers
  card.addEventListener('dragstart', dragStart);
  card.addEventListener('dragend', dragEnd);

  return card;
}

function statusDisplayName(status) {
  switch(status) {
    case 'todo': return 'Todo';
    case 'in_process': return 'In Process';
    case 'under_testing': return 'Under Testing';
    case 'done': return 'Done';
    default: return status;
  }
}

function priorityGlyph(priority) {
  const p = (priority || '').toLowerCase();
  if (p === 'high') return `<span class="priority-glyph priority-high" title="High priority" aria-label="High priority">▲▲</span>`;
  if (p === 'medium') return `<span class="priority-glyph priority-medium" title="Medium priority" aria-label="Medium priority">▲</span>`;
  return `<span class="priority-glyph priority-low" title="Low priority" aria-label="Low priority">⎯⎯</span>`;
}

// Drag and drop functions
let draggedCard = null;

function dragStart(e) {
  draggedCard = this;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => this.style.display = 'none', 0); // hide original card
}

function dragEnd(e) {
  draggedCard.style.display = 'block';
  draggedCard = null;
}

function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function drop(e) {
  e.preventDefault();
  if (!draggedCard) return;
  const status = this.dataset.status;
  const taskId = draggedCard.dataset.id;
  updateTaskStatus(taskId, status);
}

// Fetch all tasks from backend
async function fetchTasks() {
  try {
    const resp = await fetch(API_URL);
    tasks = await resp.json();
    renderBoard();
    updateTagFilterOptions();
  } catch (err) {
    alert('Failed to load tasks. Make sure backend is running.');
  }
}

// Render the board columns and tasks with filters applied
function renderBoard() {
  ['todo', 'in_process', 'under_testing', 'done'].forEach(status => {
    const listEl = document.getElementById(status + '-list');
    listEl.innerHTML = '';

    let filteredTasks = tasks.filter(t => t.status === status);
    if (filterTags.size > 0) {
      filteredTasks = filteredTasks.filter(t => 
        t.tags && t.tags.some(tag => filterTags.has(tag))
      );
    }

    filteredTasks.forEach(task => {
      const taskEl = createTaskElement(task);
      listEl.appendChild(taskEl);
    });
  });
}

// Update task status on drag and drop
async function updateTaskStatus(id, newStatus) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.status = newStatus;
  if (newStatus === 'done') {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const formatted = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    task.end = formatted;
  }
  await saveTaskToBackend(task);
  renderBoard();
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) { el.classList.add('drop-pulse'); setTimeout(()=>el.classList.remove('drop-pulse'), 400); }
}

// Open modal for new or edit task
function openTaskModal(task = null) {
  taskModal.classList.remove('hidden');
  if (task) {
    document.getElementById('modal-title').textContent = 'Edit Task';
    fillForm(task);
  } else {
    document.getElementById('modal-title').textContent = 'Create Task';
    taskForm.reset();
    document.getElementById('task-id').value = '';
    document.getElementById('task-status').value = 'todo';
  }
}

function fillForm(task) {
  document.getElementById('task-id').value = task.id;
  document.getElementById('task-title').value = task.title || '';
  document.getElementById('task-priority').value = task.priority || '';
  document.getElementById('task-desc').value = task.description || '';
  // Populate start date/time
  if (task.start) {
    const [d, t] = String(task.start).split(' ');
    if (startDateInput) startDateInput.value = d || '';
    if (startTimeInput) startTimeInput.value = (t || '').slice(0,5);
  } else {
    if (startDateInput) startDateInput.value = '';
    if (startTimeInput) startTimeInput.value = '';
  }
  document.getElementById('task-status').value = task.status || 'todo';
  document.getElementById('task-tags').value = (task.tags || []).join(', ');
  if (task.status === 'done' && task.end) {
    if (completedRow) completedRow.classList.remove('hidden');
    if (completedAtEl) completedAtEl.textContent = task.end;
  } else {
    if (completedRow) completedRow.classList.add('hidden');
    if (completedAtEl) completedAtEl.textContent = '';
  }
}

// Save task to backend (create or update)
async function saveTaskToBackend(task) {
  if (!task.title || !task.priority || !task.status) {
    alert('Title, Priority and Status are required');
    return;
  }

  // Prepare tags array
  if (typeof task.tags === 'string') {
    task.tags = task.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  try {
    // Always ensure status defaults to 'todo' if missing
    if (!task.status) task.status = 'todo';
    const hasValidId = typeof task.id === 'string' && task.id !== 'undefined' && task.id.trim().length > 0;
    if (hasValidId) {
      // update
      const resp = await fetch(`${API_URL}/${encodeURIComponent(task.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Update failed (${resp.status})`);
      }
      const data = await resp.json();
      const idx = tasks.findIndex(t => t.id === data.id);
      if (idx > -1) {
        tasks[idx] = data;
      }
    } else {
      // create
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Create failed (${resp.status})`);
      }
      const data = await resp.json();
      tasks.push(data);
    }
    updateTagFilterOptions();
    renderBoard();
    closeModal();
  } catch (err) {
    alert(`Failed to save task: ${err.message}`);
  }
}

// Close modal
function closeModal() {
  taskModal.classList.add('hidden');
}

function combineStartDateTime() {
  const d = startDateInput ? startDateInput.value : '';
  const t = startTimeInput ? startTimeInput.value : '';
  if (!d && !t) return '';
  return `${d}${t ? ' ' + t : ''}`.trim();
}

// Update filter tag options based on tasks
function updateTagFilterOptions() {
  const allTags = new Set();
  tasks.forEach(t => {
    if (t.tags && t.tags.length) {
      t.tags.forEach(tag => allTags.add(tag));
    }
  });

  // Clear existing options
  tagFilterSelect.innerHTML = '';

  Array.from(allTags).sort().forEach(tag => {
    const opt = document.createElement('option');
    opt.value = tag;
    opt.textContent = tag;
    if (filterTags.has(tag)) {
      opt.selected = true;
    }
    tagFilterSelect.appendChild(opt);
  });
}

// Apply filters on tag selection change
tagFilterSelect.addEventListener('change', e => {
  filterTags = new Set(Array.from(e.target.selectedOptions).map(o => o.value));
  renderBoard();
});

// Clear filter button
clearFilterBtn.addEventListener('click', () => {
  filterTags.clear();
  // Repopulate options based on current tasks so the dropdown
  // does not remain empty after clearing the filter
  updateTagFilterOptions();
  renderBoard();
});

// Global add task button
if (globalAddBtn) {
  globalAddBtn.addEventListener('click', () => openTaskModal({ status: 'todo' }));
}

// Filter modal controls
if (filterOpenBtn) filterOpenBtn.addEventListener('click', () => filterModal.classList.remove('hidden'));
if (closeFilterBtn) closeFilterBtn.addEventListener('click', () => filterModal.classList.add('hidden'));
if (filterModal) filterModal.addEventListener('click', e => { if (e.target === filterModal) filterModal.classList.add('hidden'); });

// Form submit
taskForm.addEventListener('submit', e => {
  e.preventDefault();
  const rawId = document.getElementById('task-id').value;
  const normalizedId = (rawId && rawId !== 'undefined' && rawId.trim().length > 0) ? rawId.trim() : null;
  const newTask = {
    id: normalizedId,
    title: document.getElementById('task-title').value.trim(),
    priority: document.getElementById('task-priority').value,
    description: document.getElementById('task-desc').value.trim(),
    start: combineStartDateTime(),
    status: document.getElementById('task-status').value,
    tags: document.getElementById('task-tags').value.split(',').map(t => t.trim()).filter(t => t.length > 0),
  };

  saveTaskToBackend(newTask);
});

// Close modal button
closeModalBtn.addEventListener('click', closeModal);
taskModal.addEventListener('click', e => {
  if (e.target === taskModal) closeModal();
});

// Set up drag and drop listeners for columns
document.querySelectorAll('.column').forEach(column => {
  column.addEventListener('dragover', dragOver);
  column.addEventListener('drop', drop);
});

// Initialize app
fetchTasks();
