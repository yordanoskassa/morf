"""FastAPI entry. Routes: /morph /undo /scoreboard /voice/signed-url. 🔒 immutable."""
from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import braintrust_logger, elevenlabs_voice
from .morph_engine import run_morph
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


@app.post("/undo")
async def undo(req: UndoRequest) -> dict:
    """User reverted a morph — flip its undo score and (optionally) revert the commit."""
    braintrust_logger.log_undo(req.span_id)
    # commit revert via Daytona is intentionally left to a follow-up job; the quality
    # signal (undo score) is what the scoreboard needs and lands immediately.
    return {"ok": True}


@app.get("/scoreboard", response_model=ScoreboardResponse)
async def scoreboard() -> ScoreboardResponse:
    return await braintrust_logger.scoreboard()


@app.get("/voice/signed-url")
async def voice_signed_url() -> dict:
    return await elevenlabs_voice.signed_url()
