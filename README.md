# morph — a coding chat that builds itself

A web app that rewrites its own source from chat. You ask for a change; **3 open-source
models race** to build it; each candidate is **compiled + rendered in a Daytona sandbox**;
**Braintrust** scores every attempt; the winner **ships to GitHub** and hot-reloads. A live
**scoreboard** shows morph quality climbing. **Undo-rate is the quality metric.**

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design.

## The 4 tools
- **Daytona** — sandbox per candidate: apply → `npm run build` (compiled?) → dev server + preview URL (rendered?) → `git push`.
- **Fireworks** — the 3 racers: `kimi-k2p7-code`, `glm-5p2`, `qwen3p7-plus`.
- **Braintrust** — logs each morph as a span (compiled/rendered/undo/latency), proxies the model calls, powers the scoreboard via BTQL.
- **ElevenLabs** — talk to the chatbot (`@elevenlabs/react`, backend-minted signed URL).

## Immutable vs mutable
The chat, scoreboard, voice, and all engine code are **locked** (`IMMUTABLE.json`). Morphs
may only write files under `frontend/src/mutable/**`. The `immutable_guard` rejects any diff
touching a protected path **before** it runs — so a bad morph can't break the chat.

## Run locally

**Backend** (FastAPI):
```bash
cd backend
cp .env.example .env         # fill in keys
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** (Vite + React + shadcn):
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                  # http://localhost:3000
```

## Deploy

### Backend → EasyPanel
1. Create an **App** from this GitHub repo.
2. Build with the root `Dockerfile` (context = repo root).
3. Expose port **8000** (or set `PORT` — the image respects it).
4. Health check path: `/health`.
5. Copy every key from `backend/.env.example` into EasyPanel **Environment** (do not bake `.env` into the image).

### Frontend → Netlify
1. New site from this GitHub repo. `netlify.toml` already sets:
   - base: `frontend`
   - build: `npm run build`
   - publish: `dist`
2. In Netlify env, set:
   ```
   VITE_API_BASE=https://YOUR-EASYPANEL-BACKEND-URL
   ```
   (no trailing slash). Redeploy after changing it — Vite inlines this at build time.
3. Open the Netlify URL; the UI talks to EasyPanel over CORS (`allow_origins=["*"]`).

## What you still need to wire
1. Real keys in EasyPanel env (Daytona, Braintrust, Fireworks, GitHub PAT, Mongo, optional ElevenLabs).
2. `GITHUB_REPO` = the repo Daytona pushes morphs to (this repo).
3. Optional: Daytona snapshot `morph-node20` + `DAYTONA_MODE=snapshot` for warmer starts.
4. `BRAINTRUST_PROJECT_ID` for the scoreboard BTQL query.
5. ElevenLabs agent id if you want voice.
