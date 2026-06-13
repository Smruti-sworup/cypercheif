# Deployment Guide - Ultimate Multiplayer Gaming Hub

This document explains production deployment patterns for the Ultimate Multiplayer Gaming Hub.

---

## 1. Static Assets Compilation (Frontend)
Before deploying, compile the React bundle into static files:
```bash
cd games/game/frontend
npm run build
```
Vite will compile files into `games/game/frontend/dist/`.

To serve this production bundle from the Express API server:
1. In `games/game/backend/server.js`, mount the static directory path:
   ```javascript
   const path = require('path');
   app.use(express.static(path.join(__dirname, '../frontend/dist')));
   
   // Direct any non-API routes to index.html to allow SPA routing
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
   });
   ```
2. Build and run the single Express app on a production port (e.g. port `8080` for Google Cloud Run or AWS Elastic Beanstalk).

---

## 2. Environment Configurations
In production, ensure the following are modified:
- **CORS Configuration**: Restrict origins in `backend/server.js` from `*` to the actual public domain URL.
- **JWT_SECRET**: Use a secure, random string (e.g., 256-bit hash) saved in system environment variables, not in plain code files.
- **Port mapping**: Ensure your reverse proxy (e.g., Nginx or Cloudflare) routes secure WebSocket (`wss://`) traffic alongside standard HTTPS.

---

## 3. Containerization (Docker)
A sample production `Dockerfile` located in the root of the project:
```dockerfile
# Step 1: Build Frontend React Assets
FROM node:18-slim AS builder
WORKDIR /app
COPY game/frontend/package*.json ./
RUN npm install
COPY game/frontend/ ./
RUN npm run build

# Step 2: Build Production Runner
FROM node:18-slim
WORKDIR /app
COPY game/backend/package*.json ./
RUN npm install --omit=dev
COPY game/backend/ ./
COPY --from=builder /app/dist ./public

ENV PORT=8080
ENV JWT_SECRET=prod_random_hash_key_xyz!
EXPOSE 8080

CMD ["npm", "start"]
```
This multi-stage Docker build yields a lightweight, single-port deployment container.
