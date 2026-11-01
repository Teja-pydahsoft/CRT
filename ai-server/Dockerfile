FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/models \
    HF_HUB_CACHE=/models/hub
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends espeak-ng \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./
RUN useradd --system --uid 10001 appuser \
    && mkdir -p /models \
    && chown -R appuser:appuser /models
USER appuser

EXPOSE 8001
CMD ["gunicorn", "--bind", "0.0.0.0:8001", "--workers", "1", "--threads", "1", "--timeout", "120", "app:app"]
