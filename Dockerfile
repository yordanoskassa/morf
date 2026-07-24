# Backend image for EasyPanel.
# App port: 8000 (or $PORT if EasyPanel injects it).
FROM python:3.12-slim

WORKDIR /app

# System deps (certs for HTTPS to Fireworks / Daytona / Braintrust / Mongo)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Whole repo so Daytona morphs can read / write frontend mutable sources.
COPY . .
ENV MORPH_REPO_ROOT=/app \
    PYTHONUNBUFFERED=1 \
    PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-8000}/health" || exit 1

CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
