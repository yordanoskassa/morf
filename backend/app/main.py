"""FastAPI entry. Routes: /morph /undo /scoreboard /voice/signed-url. 🔒 immutable."""
from __future__ import annotations
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from . import braintrust_logger, elevenlabs_voice, store
from .morph_engine import run_morph, run_morph_stream
from .schemas import MorphRequest, MorphResponse, UndoRequest, ScoreboardResponse

app = FastAPI(title="Morph — a coding chat that builds itself")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to the frontend origin in prod
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.post("/morph", response_model=MorphResponse)
async def morph(req: MorphRequest) -> MorphResponse:
    """Race 3 models to satisfy the prompt, sandbox-test each, ship the winner."""
    return await run_morph(req)


@app.post("/morph/stream")
async def morph_stream(req: MorphRequest) -> StreamingResponse:
    """Same as /morph but streams detailed live progress as Server-Sent Events.
    Terminates with a 'done' event carrying the full result."""
    async def gen():
        async for ev in run_morph_stream(req):
            yield f"data: {json.dumps(ev)}\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    })


@app.post("/undo")
async def undo(req: UndoRequest) -> dict:
    """User reverted a morph — flip its undo signal in Mongo + Braintrust."""
    await store.mark_undo(req.span_id)          # consistent source of truth
    braintrust_logger.log_undo(req.span_id)     # scoring layer
    return {"ok": True}


@app.get("/scoreboard", response_model=ScoreboardResponse)
async def scoreboard() -> ScoreboardResponse:
    # Mongo is the consistent source of truth; fall back to Braintrust if it's off.
    if store.enabled():
        return await store.scoreboard()
    return await braintrust_logger.scoreboard()


@app.get("/voice/signed-url")
async def voice_signed_url() -> dict:
    return await elevenlabs_voice.signed_url()
