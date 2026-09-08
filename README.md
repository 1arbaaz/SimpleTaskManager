# TaskFlow

AI-powered task manager. A React Native (Expo) mobile app talks to a Django REST API. Tasks are stored in SQLite through the Django ORM. Google Gemini is used only from Django to turn natural language into a structured task the user can review before saving.

## Problem statement

People often capture work as messy sentences. TaskFlow lets you manage tasks in a simple mobile app, and optionally describe a task in plain English. The AI suggests a title, description, due date, and priority. Nothing is saved until you review and confirm.

## Features

- Dashboard: pending, completed, and overdue counts
- Create, view, edit, and delete tasks
- Complete and reopen tasks
- Search by title and description
- Filter by priority and status
- Create a task from natural language (Gemini)
- Review and edit AI output before save
- Loading, empty, and error states
- Delete confirmation

## Technology stack

- Mobile: React Native, Expo, TypeScript, Expo Router
- Backend: Python, Django, Django REST Framework
- Database: SQLite via Django ORM
- AI: Google Gemini API (server-side only)

## Architecture

```
React Native (Expo)
        |
        v
Django REST Framework
        |
        ├──────────> SQLite
        |
        └──────────> Gemini API
```

Django is the source of truth. The mobile app has no task database.

Normal CRUD:

User → React Native → Django REST API → DRF serializer → Django ORM → SQLite → JSON → UI

AI flow:

User text → React Native → `POST /api/ai/create-task/` → Django → Gemini → validated JSON → review screen → user Save → `POST /api/tasks/` → SQLite

The AI endpoint does **not** insert a Task row.

## Database

SQLite file: `backend/db.sqlite3`

`Task` fields: `id`, `title`, `description`, `due_date`, `priority` (`low` / `medium` / `high`), `status` (`pending` / `completed`), `created_at`, `updated_at`

Overdue is computed, not stored: `due_date < today` and `status = pending`.

## REST APIs

| Method | URL |
|---|---|
| GET, POST | `/api/tasks/` |
| GET, PUT, PATCH, DELETE | `/api/tasks/<id>/` |
| POST | `/api/tasks/<id>/complete/` |
| POST | `/api/tasks/<id>/reopen/` |
| GET | `/api/dashboard/` |
| POST | `/api/ai/create-task/` |

List supports `?search=`, `?priority=`, `?status=`, including combinations.

## Gemini integration

- API key lives only in `backend/.env` as `GEMINI_API_KEY`
- Django sends today's date in the prompt so relative dates can be resolved
- Gemini must return JSON: `title`, `description`, `dueDate`, `priority`
- Django validates JSON, required fields, priority, and date format
- Invalid or failed AI responses return a safe error and save nothing

## Error handling

- Invalid forms: 400 with field errors
- Missing task: 404
- Gemini rate limit: 429
- Gemini / invalid AI output: 502 with a friendly message
- Mobile network failure: connection error + Retry
- AI failure does not block manual create

## Security

- Gemini key is never in React Native, git, or README
- `.env` is gitignored
- Copy `.env.example` to `.env` and add your key locally

## Environment variables

`backend/.env`:

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash
```


### Setup Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# put your Gemini key in .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Django Admin Credentials : `admin` / `admin123`

### Setup Mobile

```bash
cd mobile
npm install
npx expo start --web #for simple web version
```

Open with Expo Go, an Android emulator or Web.

### API base URL

The app uses the Expo packager host on port **8000**.

- Android emulator fallback: `http://10.0.2.2:8000/api`
- iOS simulator fallback: `http://127.0.0.1:8000/api`
- Physical device: same Wi-Fi as the computer; `localhost` on the phone is the phone

Django must run as `0.0.0.0:8000` for a physical phone.

## Project structure

```
tskmngr/
├── README.md
├── INTERVIEW_GUIDE.md
├── backend/          Django + DRF + SQLite + Gemini
└── mobile/           Expo + TypeScript
```

