const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(bodyParser.json());

// Data store file
const DATA_FILE = path.join(__dirname, 'tasks.json');

// Helper to load tasks from JSON
async function loadTasks() {
  try {
    const exists = await fs.pathExists(DATA_FILE);
    if (!exists) {
      await fs.writeJson(DATA_FILE, []);
      return [];
    }
    return await fs.readJson(DATA_FILE);
  } catch (err) {
    console.error('Error reading data file:', err);
    return [];
  }
}

// Helper to save tasks to JSON
async function saveTasks(tasks) {
  try {
    await fs.writeJson(DATA_FILE, tasks, { spaces: 2 });
  } catch (err) {
    console.error('Error writing data file:', err);
  }
}

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  const tasks = await loadTasks();
  res.json(tasks);
});

// Create new task
app.post('/api/tasks', async (req, res) => {
  const tasks = await loadTasks();
  const newTask = req.body || {};
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
