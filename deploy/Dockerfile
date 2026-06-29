# HireFlow AI — multi-stage Docker build
# Targets: backend (FastAPI) | frontend (nginx + React static)

# ── Stage 1: Build React dashboard ──────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /build

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./

# Override at build time for your ECS public IP/domain
ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_WS_URL=ws://localhost:8000/ws/pipeline
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

RUN npm run build

# ── Stage 2: Nginx serving React + reverse proxy ────────────
FROM nginx:1.27-alpine AS frontend

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /build/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ── Stage 3: FastAPI backend ────────────────────────────────
FROM python:3.11-slim AS backend

WORKDIR /app

# System deps for PyMuPDF and health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libmupdf-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Local upload fallback + Google Service Account mount point
RUN mkdir -p /app/data/uploads /app/credentials

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV APP_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
