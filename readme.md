# Jira Clone Dashboard

## Overview
This is a simplified Jira-like board web application with columns "Todo", "In Process", "Under Testing", and "Done". It supports draggable task cards, multiple tags with global filtering, date-time pickers for timestamps, and data persistence using a local Node.js backend with JSON file storage.

## Requirements
- Node.js (version 16 or newer recommended)
- npm (comes with Node.js)

## Setup Instructions

1. Clone or download this project folder.

2. Backend setup:
   - Open terminal/command prompt
   - Navigate to `/backend` folder
   - Run `npm install` to install dependencies
   - (Optional) Set a custom port with `PORT=4000 npm start`
   - Run `npm start` to start the backend server on `http://localhost:3000` (or your `PORT`)

3. Frontend setup:
   - Open `/frontend/index.html` in a modern web browser (Chrome, Firefox, Edge)
   - The frontend communicates with the localhost backend. If you changed the backend port, update `API_URL` in `frontend/app.js:1` accordingly.

## Features
- Four draggable columns representing task status.
- Add, edit, and view tasks in two viewing modes.
- Each task supports title, description, priority (low/medium/high), start/end timestamps (date and time), status, and multiple tags.
- Global tag filtering with multi-select dropdown.
- Responsive design with a clean white background and shades of green, blue, and red.
- Data persistence in a local JSON file on backend.

## Notes
- No authentication is implemented; it is assumed to run locally.
- Data is stored persistently in `backend/tasks.json`.
- Backend uses Express with simple REST API.

## License
MIT License
