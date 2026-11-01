# VERSANT English Language Testing System

A web-based English language testing platform with role-based administration, online exams, practice modules, audio exercises, and analytics.

## Features

- Role-based super-admin, campus-admin, course-admin, and student experiences.
- Listening, speaking, reading, writing, grammar, and vocabulary tests.
- Exam monitoring, progress tracking, and reporting.
- Real-time updates with Socket.IO.
- Bulk CSV/Excel operations and AWS S3 file storage.
- Email integration with Brevo.

## Architecture

- **Frontend:** React 18, Vite, Tailwind CSS.
- **Backend:** Node.js, Express, Mongoose, and Socket.IO.
- **Database:** MongoDB.
- **Speech service:** Python Flask/Gunicorn; local CPU Whisper transcription (faster-whisper tiny/int8) and offline eSpeak NG text-to-speech.
- **Deployment:** Docker Compose can run the frontend, API, speech service, and MongoDB together.

Speech recognition and synthesis run locally in the AI service; no OpenAI key or external speech provider is required. The first transcription downloads the small Whisper model into a persistent Docker volume. The stack is sized for the shared Lightsail instance with about 3.7 GiB of RAM, not for a 1 GB instance; keep traffic low and monitor memory alongside the existing workloads.

## Quick start with Docker

1. Install Docker Engine and Docker Compose.
2. Copy `env.example` to `.env`.
3. Set unique MongoDB and JWT secrets.
4. Start the stack:

   ```bash
   docker compose up -d --build
   ```

5. Open `http://localhost` and verify `http://localhost/api/health`.

The API and database are private to the Compose network; only the frontend port is published. See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for the shared Lightsail setup, image building, HTTPS, and operations.

## Local development

Start MongoDB and configure `MONGODB_URI`, JWT secrets, and service credentials in the root `.env`. Then run the backend:

```bash
cd backend
npm ci
npm run dev
```

In another terminal, install the `espeak-ng` system package, install Python dependencies, and start the speech service:

```bash
cd ai-server
pip install -r requirements.txt
python app.py
```

Start the React development server in a third terminal:

```bash
cd frontend
npm ci
npm run dev
```

The backend listens on port 8000, the AI service on port 8001, and Vite on port 3000 by default.
