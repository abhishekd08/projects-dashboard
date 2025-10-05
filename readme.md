# Tasks Dashboard

## Overview
Lightweight Jira‑style board with four columns (Todo, In Process, Under Testing, Done). Features draggable cards, global tag filtering, a simple create/edit modal, and a Node.js backend that persists to a JSON file.

## Requirements
- Node.js (version 16 or newer recommended)
- npm (comes with Node.js)

## Setup

1. Clone or download this project folder.

2. Backend setup:
   - Open terminal/command prompt
   - Navigate to `/backend` folder
   - Run `npm install` to install dependencies
   - (Optional) Set a custom port with `PORT=4000 npm start`
   - Run `npm start` to start the backend server at `http://localhost:3000` (or your `PORT`)

3. Frontend setup:
   - Open `frontend/index.html` in a modern browser (Chrome, Firefox, Edge)
   - If you changed the backend port, update `API_URL` in `frontend/app.js:1`.
## Current Functionality
- Board
  - Four fixed columns side‑by‑side: Todo, In Process, Under Testing, Done
  - Drag and drop between columns
  - Moving a task to Done auto‑sets its end time to the current date/time

- Cards
  - Compact view shows: title, up to two lines of description, priority icon (top‑right)
  - Left color stripe indicates priority (green/blue/red)
  - “Completed …” footnote shows only when in Done
  - Click a card to open a detail modal (no inline expansion)

- Create/Edit Modal
  - Open via the global “+ Add Task” (top‑right) or by clicking a card
  - Create defaults: Priority = Low, Status = Todo, Start date = today, Start time = now
  - Only Title is required on the frontend (backend validates fields)
  - Start time uses separate date and time inputs (Pikaday date + native time)
  - End time is read‑only and appears after a task moves to Done
  - Press ESC to close the modal

- Filtering
  - Filter button opens a modal with a multi‑select Tags control
  - Clear Filter repopulates tag options immediately

- Styling and UX
  - Standard theme with white surfaces, near‑black text, and green accents
  - Subtle animations for buttons, modal open/close, hover, and card drop pulse

## Notes
- Run backend first, then open the frontend HTML file.
- Data persists to `backend/tasks.json`.
- Backend uses Express with simple REST API.
- Designed for single‑machine/local use (no auth).

## License
MIT License
