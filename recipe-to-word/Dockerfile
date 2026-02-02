# ---------- Frontend build ----------
FROM node:20-slim AS frontend
WORKDIR /app/front

COPY front/package*.json ./
RUN npm ci

COPY front/ .
RUN chmod +x node_modules/.bin/vite
RUN npm run build


# ---------- Backend ----------
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Python deps
COPY back/requirements.txt /app/back/requirements.txt
RUN pip install --no-cache-dir -r /app/back/requirements.txt

# Backend code
COPY back /app/back

# Front build output
COPY --from=frontend /app/front/dist /app/front/dist

# Runtime dirs
RUN mkdir -p /app/back/uploads /app/back/output

EXPOSE 8080

CMD ["sh", "-c", "uvicorn back.main:app --host 0.0.0.0 --port ${PORT}"]
