# AccessBridge AI: the API and the built site in one container.
#
# The processed data is copied in from data/processed, so build the data
# pipeline first (see README). The image serves the site at / and the API at
# /scenario, /optimise and /evidence on port 8000.

FROM node:22-alpine AS site
WORKDIR /site
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends coinor-cbc && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml README.md ./
COPY app ./app
RUN pip install --no-cache-dir .
COPY data/processed ./data/processed
COPY --from=site /site/dist ./frontend/dist
EXPOSE 8000
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
