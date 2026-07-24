# Morph — a coding chat that builds itself

A web app that **rewrites its own source code from chat**. You type (or speak) a
request; the app edits itself, runs the edit in a sandbox, scores it, and — if it's
good — ships it to GitHub and hot-reloads in front of you.

Every edit is a **morph**. The novel part: the app scores every morph, races 3
open-source models to produce it, and a **live scoreboard** shows morph quality
climbing. **Undo-rate is the quality metric.**

---

## Immutable vs mutable

Chosen model: **self-editing repo** (the chat edits its own codebase).

- 🔒 **Immutable** — the chat UI, the morph engine, the scoreboard, the voice widget,
  and all tool-integration code. A morph can *never* touch these. Enforced by
  `IMMUTABLE.json` + `immutable_guard.py` **before** any code runs.
- ✏️ **Mutable** — everything else: components, pages, styling, features. This is what
  the chat reshapes.

A bad morph therefore can't brick the chat — the guard rejects any diff that touches a
protected glob, and even a mutable diff only ships after it compiles + renders in a
throwaway sandbox.

---

## The 4 tools

| Tool | Role | Key API |
|------|------|---------|
| **Daytona** | Sandbox per candidate: apply diff → build (compile check) → dev server + preview URL (render check) → `git push` to GitHub | `daytona.create`, `sandbox.process.exec`, `sandbox.get_preview_link`, `sandbox.git.push` |
| **Fireworks** | 3 open-source models generate competing diffs | OpenAI SDK, `model="accounts/fireworks/models/..."` |
| **Braintrust** | Logs every morph as a span (compiled/rendered/undo/latency); proxies the Fireworks calls; powers the scoreboard | `init_logger`, `start_span`, `log_feedback`, `/btql` |
| **ElevenLabs** | Talk to the chatbot by voice | `@elevenlabs/react`, backend mints signed URL |

Routing trick: **Fireworks calls go *through* Braintrust's OpenAI-compatible proxy**
(`base_url=https://api.braintrust.dev/v1/proxy`, `api_key=<braintrust key>`). One
base-URL change → every model call is auto-logged, cached, and evaluable. No separate
logging glue.

### Model panel (the 3 racers)

Picked to make "which model handles which edit type" a real, visible result:

- **Kimi K2.5** — visual-to-code / frontend prototyping specialist
- **GLM 5.2** — Opus-level general reasoning
- **Qwen3 Coder** — fast, cheap workhorse

(Exact Fireworks model-ID strings live in `backend/app/models.py`.)

---

## The morph loop (one edit)

```
user prompt (typed or spoken)
   │
   ▼
[1] POST /morph  (FastAPI)
   │
   ▼
[2] immutable_guard: classify edit-type, resolve target files (mutable only)
   │         └─ diff touches a 🔒 path?  → reject, log as "blocked"
   ▼
[3] fan out to 3 Fireworks models (via Braintrust proxy) → 3 candidate diffs
   │
   ▼
[4] for each candidate  →  Daytona sandbox (parallel, ephemeral):
   │      apply diff → `npm run build`      → compiled?  (exit_code==0)
   │      → `npm run dev` + fetch preview   → rendered?  (HTTP 200)
   │      → time every step                 → latency_ms
   │
   ▼
[5] Braintrust span per candidate:
   │      input  = {prompt, diff}
   │      output = new_code
   │      scores = {compiled:0|1, rendered:0|1, undo:0|1}
   │      metrics= {latency_ms}
   │      metadata = {model, edit_type}
   │
   ▼
[6] pick winner (compiled && rendered, then lowest latency / best scorer)
   │      apply to repo → Daytona git commit + push to GitHub
   │
   ▼
[7] frontend hot-reloads (Vite HMR) — the change appears
   │
   ▼
[8] UNDO within N s?  → log_feedback(id=span_id, scores={undo:1}) + git revert
   │
   ▼
[9] scoreboard polls /scoreboard (BTQL aggregation) → quality climbs live
```

Key detail for step 8: the winning span's `id` is stored client-side. When the user
undoes, we call Braintrust `log_feedback(id=..., scores={undo:1})` to update the
*already-logged* span. That's what makes undo-rate trend over time.

---

## Scoreboard (the prize visual)

A locked panel next to the chat. Polls `POST /scoreboard`, which runs a BTQL query:

```sql
SELECT metadata.model,
       metadata.edit_type,
       avg(scores.compiled) AS compile_rate,
       avg(scores.rendered) AS render_rate,
       avg(scores.undo)     AS undo_rate,
       avg(metrics.latency_ms) AS p50_latency,
       count(*) AS n
FROM project_logs('<PROJECT_ID>')
WHERE created > now() - interval 1 day
GROUP BY metadata.model, metadata.edit_type
```

Renders as:
- a live line chart: **1 − undo_rate** (morph quality) climbing over time,
- a per-model / per-edit-type table (who wins renames vs. layout vs. new-feature).

---

## Repo layout

```
morph/
├─ IMMUTABLE.json              # 🔒 protected globs manifest
├─ Dockerfile                  # backend image for EasyPanel
├─ docs/ARCHITECTURE.md        # this file
├─ frontend/                   # Vite + React + TS + shadcn  (this IS the app being edited)
│  └─ src/
│     ├─ immutable/            # 🔒 chat, scoreboard, voice, morph-client
│     └─ mutable/              # ✏️ everything morphs can edit
│     └─ components/ui/        # real shadcn primitives (added via CLI, not generated)
└─ backend/                    # FastAPI  (hosted on EasyPanel)
   └─ app/
      ├─ main.py               # routes: /morph /undo /scoreboard /voice/signed-url
      ├─ morph_engine.py       # 🔒 orchestrates the loop above
      ├─ immutable_guard.py    # 🔒 rejects diffs touching protected paths
      ├─ models.py             # 🔒 Fireworks-via-Braintrust routing, the 3 racers
      ├─ daytona_runner.py     # 🔒 sandbox: apply → build → render → push
      ├─ braintrust_logger.py  # 🔒 spans + log_feedback + BTQL scoreboard
      └─ elevenlabs_voice.py   # 🔒 signed-URL minting for the voice widget
```

## Deploy

- **Backend** → EasyPanel from `Dockerfile` (FastAPI + uvicorn). Env: all API keys.
- **Frontend** → Vite build; served static (EasyPanel static service or same box).
- **GitHub** → Daytona pushes winning morphs with a PAT.

## Env vars

```
DAYTONA_API_KEY=
BRAINTRUST_API_KEY=
BRAINTRUST_PROJECT_ID=           # for BTQL scoreboard
FIREWORKS_API_KEY=               # only if bypassing the Braintrust proxy
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
GITHUB_TOKEN=                    # PAT for Daytona git push
GITHUB_REPO=                     # owner/repo to push morphs to
```
