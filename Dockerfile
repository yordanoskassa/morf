# Backend image for EasyPanel. 🔒 immutable.
FROM python:3.12-slim

WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the whole repo so the backend can read the mutable frontend files it edits.
COPY . .
ENV MORPH_REPO_ROOT=/app

EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
