# Shared Lightsail deployment

## What runs on the instance

| Service | Memory limit | Notes |
| --- | ---: | --- |
| MongoDB | 320 MiB | Persistent Docker volume; WiredTiger cache capped at 256 MiB |
| Express backend | 256 MiB | V8 heap capped at 160 MiB; Mongo pool capped at 10 |
| Speech AI service | 768 MiB | Local faster-whisper tiny/int8; one Gunicorn worker/thread |
| Frontend Nginx | 48 MiB | Serves the built SPA and proxies API/Socket.IO |

The product containers have a combined memory ceiling of about 1.4 GiB. This targets the shared 3.7 GiB Lightsail instance described by the operator, which already runs a separate face-recognition service. At the reported snapshot about 2.1 GiB was available, but available memory and AI inference load vary. Monitor `docker stats` and host memory under real workload; this configuration is not suitable for a 1 GiB instance or guaranteed to support high concurrency.

The existing face-recognition service publishes host port 8000. The product API uses port 8000 only inside its private Docker network, and its speech service uses private port 8001; neither binds those host ports. Only the product frontend publishes host port 80, which must remain unused by other host services. The product runs its own MongoDB volume and does not connect to, replace, or publish the existing MongoDB container.

## Prerequisites

- Ubuntu Lightsail instance with at least 4 GiB RAM and adequate disk. This deployment is not designed for 1 GiB RAM.
- Docker Engine and the Docker Compose plugin.
- A domain name and HTTPS termination for production.
- Outbound internet access for downloading the Whisper model on first transcription. Once downloaded, the model is retained in the `ai_model_cache` volume. Audio inference itself runs locally with no external AI API key or provider charge.
- `espeak-ng` is installed in the AI service image and synthesizes speech locally.
- AWS S3 and Brevo credentials for file storage and real email delivery. Those integrations can be left unconfigured, but their dependent features will not work; production email requests now return an explicit configuration error if Brevo is missing.
- MySQL/RDS credentials only if the optional SDMS/organization data integration is enabled.
- A container registry if you build images away from the Lightsail host (recommended).

## Configure

1. Clone the repository on the instance and enter its root directory.
2. Copy `env.example` to `.env`; enter strong, unique MongoDB and JWT secrets. Keep MongoDB usernames and passwords URL-safe because they are included in connection URIs.
3. If building on a separate machine or CI, set `BACKEND_IMAGE`, `AI_SERVER_IMAGE`, and `FRONTEND_IMAGE` in `.env` to the pushed image tags. Make sure the Lightsail host can pull those images.
4. Open only SSH and the public web ports in the Lightsail firewall. Do not open MongoDB (27017), backend (8000), or AI (8001).

Generate secrets on a trusted machine, for example:

```bash
openssl rand -hex 32
```

Use distinct generated values for `MONGO_ROOT_PASSWORD`, `JWT_SECRET_KEY`, and `JWT_REFRESH_SECRET_KEY`. Leave `WHISPER_MODEL=tiny` and `WHISPER_CPU_THREADS=2` for the shared instance unless a different model has been load-tested.

## Build and start

Build the images on a workstation or CI runner with Docker, not on the 1 GB server. A frontend production build can exceed the server's available build memory. Authenticate to your image registry, configure the three image tags in `.env`, and run:

```bash
docker compose build
docker compose push backend ai-server frontend
```

The build does not need production credentials. Compose still requires non-empty settings while parsing its configuration, so CI can supply temporary placeholder values for the required MongoDB and JWT variables; keep real secrets only in the Lightsail `.env`.

On Lightsail, pull and start the prebuilt images:

```bash
docker compose pull
docker compose up -d --no-build
docker compose ps
```

For a one-off local deployment where builds are already known to fit:

```bash
docker compose up -d --build
```

The application is served on port 80 by default. Set `FRONTEND_PORT` if another host service already owns that port. Configure HTTPS at a Lightsail load balancer or another TLS-terminating proxy; do not expose the backend or database to the internet.

## Verify and monitor

```bash
curl http://localhost/health
curl http://localhost/api/health
docker compose ps
docker stats
docker compose logs --tail=100
```

The first health check is served by Nginx; the second is proxied to the Express API. Check the `ai-server` logs if transcription or TTS fails. The first transcription downloads the tiny model, so allow time and outbound internet on that first request. Later transcription and local eSpeak NG speech synthesis do not call an external speech API.

Monitor available memory, swap, and all containers during real traffic, especially while transcription is running alongside the existing face-recognition AI. A small swap file can reduce abrupt process termination during brief memory spikes, but does not replace RAM.

## Data and operations

- MongoDB data is stored in the `mongodb_data` Docker volume.
- Back up MongoDB data regularly and test restoring a backup before relying on the instance.
- Deploy updates by pushing new tagged images, updating the `*_IMAGE` values in `.env`, then running `docker compose pull` and `docker compose up -d --no-build`.
- `docker compose down` preserves the database volume. Do not use `docker compose down --volumes` unless you intend to delete the database.
- Review logs with `docker compose logs -f backend`, `docker compose logs -f ai-server`, or `docker compose logs -f mongodb`.

## Configuration and troubleshooting

- Compose requires MongoDB credentials and both JWT secrets; startup fails with a configuration error if they are missing.
- MySQL/RDS is not hosted by this Compose stack. Configure `DB_HOST`, `DB_USER`, and related values in `.env` only when using that external integration.
- SDMS student login, exam audience selection, and campus/course reporting require the external SDMS MySQL/RDS connection. Run `docker compose exec backend npm run migrate:sdms-attempt-indexes` once after deploying the updated backend and before opening exams to SDMS students.
- Encode special characters in MongoDB credentials before placing them in the URI, or use URL-safe random passwords.
- Set `CORS_ORIGINS` to the frontend origins that actually call the API directly. Same-origin traffic through the included Nginx proxy does not require CORS.
- If a container repeatedly restarts or reports out-of-memory, inspect `docker stats` and system memory. Reduce concurrency or upgrade the instance; do not remove memory limits as a workaround.
- If the app is unreachable, verify the Lightsail firewall, `FRONTEND_PORT`, DNS, and `docker compose ps`.
