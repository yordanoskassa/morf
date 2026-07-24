"""Request/response + internal shapes. 🔒 immutable."""
from __future__ import annotations
from pydantic import BaseModel, Field


class FileEdit(BaseModel):
    """A single file the morph rewrites (full new content — no fragile patches)."""
    path: str = Field(description="repo-relative path, e.g. frontend/src/mutable/App.tsx")
    content: str = Field(description="the complete new file content")


class MorphPlan(BaseModel):
    """What a model returns for a prompt. Enforced via Fireworks json_schema mode."""
    edit_type: str = Field(description="one of: style, layout, component, feature, copy, fix, other")
    summary: str = Field(description="one-line description of the change")
    files: list[FileEdit] = Field(description="files to create or overwrite")


class MorphRequest(BaseModel):
    prompt: str
    # optional: client can hint which files are in view
    focus: list[str] = Field(default_factory=list)


class CandidateResult(BaseModel):
    racer: str
    model: str
    edit_type: str
    summary: str
    files: list[FileEdit]
    blocked: bool = False              # touched an immutable path
    blocked_reason: str | None = None
    compiled: bool = False
    rendered: bool = False
    gen_ms: int = 0                    # model generation latency
    build_ms: int = 0
    render_ms: int = 0
    total_ms: int = 0
    build_log: str = ""
    preview_url: str | None = None
    span_id: str | None = None         # braintrust span id (for later undo feedback)
    score: float = 0.0                 # composite ranking score


class MorphResponse(BaseModel):
    winner: CandidateResult | None
    candidates: list[CandidateResult]
    shipped: bool = False
    commit_sha: str | None = None


class UndoRequest(BaseModel):
    span_id: str
    commit_sha: str | None = None      # if set, revert this commit in the repo


class ScoreboardRow(BaseModel):
    model: str
    edit_type: str
    compile_rate: float
    render_rate: float
    undo_rate: float
    quality: float                     # 1 - undo_rate
    p50_latency_ms: float
    n: int


class ScoreboardResponse(BaseModel):
    rows: list[ScoreboardRow]
    timeseries: list[dict]             # [{created, quality, model}] for the climbing chart
