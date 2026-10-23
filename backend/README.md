# VERSANT Node.js Backend

Migrated Node.js (Express) backend for the VERSANT English Language Testing System.

## Architecture Overview

```text
VERSANT/
├── frontend/                 # EXISTING React/Vite frontend (UNTOUCHED)
├── backend/                  # NEW Node.js Express backend
│   ├── src/
│   │   ├── config/           # Database, AWS, Env, Constants
│   │   ├── controllers/      # Auth, SuperAdmin, CampusAdmin, CourseAdmin, Student, Batch, Test
│   │   ├── middleware/       # JWT Auth, Role RBAC, Multer upload, Error handling
│   │   ├── models/           # Mongoose models for MongoDB
│   │   ├── routes/           # Express router endpoints matching legacy Flask API contract
│   │   ├── services/         # S3, Brevo Email, AI HTTP Proxy
│   │   ├── sockets/          # Socket.IO handlers
│   │   ├── app.js            # Express app configuration
│   │   └── server.js         # HTTP and Socket.IO server startup
│   └── package.json
└── ai-server/                # Standalone Python AI / Voice Recognition Server
```

## Quick Start

### 1. Install Node Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Python AI Server (in separate terminal)
```bash
cd ai-server
pip install -r requirements.txt
python app.py
```
