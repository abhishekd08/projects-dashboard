const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(bodyParser.json());

// Data store files
const TASKS_FILE = path.join(__dirname, 'tasks.json');
const PROJECTS_FILE = path.join(__dirname, 'projects.json');

// Helper to load tasks from JSON
async function loadTasks() {
  try {
    const exists = await fs.pathExists(TASKS_FILE);
    if (!exists) {
      await fs.writeJson(TASKS_FILE, []);
      return [];
    }
    try {
      return await fs.readJson(TASKS_FILE);
    } catch (e) {
      // File exists but is empty or malformed; reset it
      await fs.writeJson(TASKS_FILE, []);
      return [];
    }
  } catch (err) {
    console.error('Error reading data file:', err);
    return [];
  }
}

// Helper to save tasks to JSON
async function saveTasks(tasks) {
  try {
    await fs.writeJson(TASKS_FILE, tasks, { spaces: 2 });
  } catch (err) {
    console.error('Error writing data file:', err);
  }
}

// Projects helpers
async function loadProjects() {
  try {
    const exists = await fs.pathExists(PROJECTS_FILE);
    if (!exists) {
      await fs.writeJson(PROJECTS_FILE, []);
      return [];
    }
    try {
      return await fs.readJson(PROJECTS_FILE);
    } catch (e) {
      await fs.writeJson(PROJECTS_FILE, []);
      return [];
    }
  } catch (err) {
    console.error('Error reading projects file:', err);
    return [];
  }
}

async function saveProjects(projects) {
  try {
    await fs.writeJson(PROJECTS_FILE, projects, { spaces: 2 });
  } catch (err) {
    console.error('Error writing projects file:', err);
  }
}

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  const tasks = await loadTasks();
  res.json(tasks);
});

// Efficient list of tasks by project
app.get('/api/projects/:id/tasks', async (req, res) => {
  const tasks = await loadTasks();
  const projectId = req.params.id;
  res.json(tasks.filter(t => t.projectId === projectId));
});

// Projects CRUD
app.get('/api/projects', async (req, res) => {
  const projects = await loadProjects();
  res.json(projects);
});

app.post('/api/projects', async (req, res) => {
  const projects = await loadProjects();
  const title = (req.body && req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (projects.some(p => p.title === title)) return res.status(409).json({ error: 'Project title must be unique' });
  const proj = { id: Date.now().toString(), title, createdAt: new Date().toISOString() };
  projects.push(proj);
  await saveProjects(projects);
  res.json(proj);
});

app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const { confirmTitle } = req.body || {};
  let projects = await loadProjects();
  const project = projects.find(p => p.id === id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (confirmTitle !== project.title) return res.status(400).json({ error: 'Confirmation title does not match' });
  projects = projects.filter(p => p.id !== id);
  await saveProjects(projects);
  // Cascade delete tasks
  let tasks = await loadTasks();
  tasks = tasks.filter(t => t.projectId !== id);
  await saveTasks(tasks);
  res.json({ success: true });
});

// Create new task
app.post('/api/tasks', async (req, res) => {
  const tasks = await loadTasks();
  const projects = await loadProjects();
  const newTask = req.body || {};
  if (!newTask.projectId || !projects.some(p => p.id === newTask.projectId)) {
    return res.status(400).json({ error: 'Valid projectId is required' });
  }
  // Basic validation
  const allowedStatuses = new Set(['todo', 'in_process', 'under_testing', 'done']);
  if (!newTask.title || typeof newTask.title !== 'string') {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!newTask.priority || !['Low', 'Medium', 'High'].includes(newTask.priority)) {
    return res.status(400).json({ error: 'Priority must be Low, Medium, or High' });
  }
  if (!newTask.status || !allowedStatuses.has(newTask.status)) {
    return res.status(400).json({ error: 'Status must be one of todo, in_process, under_testing, done' });
  }
  if (newTask.tags && !Array.isArray(newTask.tags)) {
    return res.status(400).json({ error: 'Tags must be an array of strings' });
  }
  newTask.id = Date.now().toString(); // use timestamp as id
  tasks.push(newTask);
  await saveTasks(tasks);
  res.json(newTask);
});

// Update task by id
app.put('/api/tasks/:id', async (req, res) => {
  const tasks = await loadTasks();
  const projects = await loadProjects();
  const id = req.params.id;
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const updates = req.body || {};
  // Basic validation similar to create; only validate provided fields
  const allowedStatuses = new Set(['todo', 'in_process', 'under_testing', 'done']);
  if ('title' in updates && (!updates.title || typeof updates.title !== 'string')) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }
  if ('priority' in updates && !['Low', 'Medium', 'High'].includes(updates.priority)) {
    return res.status(400).json({ error: 'Priority must be Low, Medium, or High' });
  }
  if ('status' in updates && !allowedStatuses.has(updates.status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  if ('tags' in updates && updates.tags && !Array.isArray(updates.tags)) {
    return res.status(400).json({ error: 'Tags must be an array of strings' });
  }
  if ('projectId' in updates) {
    if (!updates.projectId || !projects.some(p => p.id === updates.projectId)) {
      return res.status(400).json({ error: 'Valid projectId is required' });
    }
  }
  tasks[index] = { ...tasks[index], ...updates };
  await saveTasks(tasks);
  res.json(tasks[index]);
});

// Delete task by id (optional)
app.delete('/api/tasks/:id', async (req, res) => {
  let tasks = await loadTasks();
  const id = req.params.id;
  tasks = tasks.filter(t => t.id !== id);
  await saveTasks(tasks);
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
