# VERSANT Node.js Backend

The Express API owns the application routes, MongoDB models, authentication, Socket.IO events, and integrations. The Python service in `../ai-server` provides speech transcription and text-to-speech.

## Production deployment

Use the root [Docker Compose deployment](../DEPLOYMENT_GUIDE.md). It starts MongoDB, the Express API, the AI/TTS service, and the React frontend. Build and push images from a separate machine or CI runner rather than building on a small Lightsail instance. The local Whisper model stack is sized for the shared host with about 3.7 GiB of RAM, not a 1 GB instance.

## Local development

1. Start a MongoDB instance and configure `MONGODB_URI`, JWT secrets, and service credentials in the root `.env`.
2. Install and start the backend:

   ```bash
   cd backend
   npm ci
   npm run dev
   ```

3. Start the local speech AI service in another terminal. No OpenAI key or external speech provider is required:

   ```bash
   cd ai-server
   pip install -r requirements.txt
   python app.py
   ```

The API listens on port 8000 and the AI service on port 8001 by default.
