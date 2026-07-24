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
- Backend → EasyPanel from the root `Dockerfile`. Set all env vars.
- Frontend → `npm run build`, serve `dist/` (EasyPanel static service).

## What you still need to wire
1. Real keys in `backend/.env` (Daytona, Braintrust, Fireworks, ElevenLabs, GitHub PAT).
2. `GITHUB_REPO` = the repo Daytona pushes morphs to (this repo, once pushed to GitHub).
3. A Daytona snapshot `morph-node20` with node 20 + the frontend deps pre-installed (warm starts).
4. `BRAINTRUST_PROJECT_ID` for the scoreboard BTQL query.
5. An ElevenLabs agent id + (optional) a webhook tool pointed at `POST /morph`.
