# QuickLearn AI

A beginner-friendly student learning website using:

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Storage: Local JSON file, no MongoDB needed

## Project Structure

```text
quicklearn-ai/
  backend/
    data/
    server.js
  frontend/
    index.html
    styles.css
    script.js
  server.js
  package.json
  .env.example
```

## How To Run

1. Install dependencies:

```bash
npm install
```

2. Optional: copy `.env.example` to `.env` if you want to change the port:

```bash
PORT=3000
```

3. Start the project:

```bash
npm start
```

You can also run the same server with:

```bash
node server.js
```

4. Open:

```text
http://localhost:3000
```

If port `3000` is already busy, the server will automatically try the next port.
Check the terminal output for the exact link.

## Notes

Student data is saved automatically in `backend/data/db.json`.
The admin dashboard and MongoDB setup were removed to keep the project easy to run.
