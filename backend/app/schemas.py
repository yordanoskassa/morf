"""Request/response + internal shapes. 🔒 immutable."""
from __future__ import annotations
from pydantic import BaseModel, Field


class FileEdit(BaseModel):
    """A surgical edit to a file. Prefer search/replace for existing files; use `content`
    only to create a new file or fully rewrite one."""
    path: str = Field(description="repo-relative path, e.g. frontend/src/stage/Stage.tsx")
    search: str | None = Field(default=None, description="exact existing snippet to find (verbatim, enough lines to be unique)")
    replace: str | None = Field(default=None, description="what to replace the search snippet with")
    content: str | None = Field(default=None, description="full file content — ONLY for a new file or a full rewrite")


class MorphPlan(BaseModel):
    """What a model returns for a prompt. Enforced via Fireworks json_schema mode."""
    edit_type: str = Field(description="one of: style, layout, component, feature, copy, fix, other")
    summary: str = Field(description="one-line description of the change")
    files: list[FileEdit] = Field(description="the edits to make — prefer minimal search/replace edits")


class MorphRequest(BaseModel):
    prompt: str
    # optional: client can hint which files are in view
    focus: list[str] = Field(default_factory=list)
    user_id: str | None = None
    user_name: str | None = None


class CandidateResult(BaseModel):
    racer: str
    model: str
    edit_type: str
    summary: str
    files: list[FileEdit]
    blocked: bool = False              # touched the kernel / outside the app
    blocked_reason: str | None = None
    compiled: bool = False
    rendered: bool = False
    chat_ok: bool = False              # chat survived (anchors still present)
    gen_ms: int = 0                    # model generation latency
    build_ms: int = 0
    render_ms: int = 0
    total_ms: int = 0
    build_log: str = ""
    preview_url: str | None = None
    span_id: str | None = None         # braintrust span id (for later undo feedback)
    score: float = 0.0                 # composite ranking score
    won: bool = False                  # this candidate won its morph


class MorphResponse(BaseModel):
    winner: CandidateResult | None
    candidates: list[CandidateResult]
    shipped: bool = False
    commit_sha: str | None = None
    morph_id: str | None = None        # id of the persisted timeline node


class UndoRequest(BaseModel):
    span_id: str
    commit_sha: str | None = None      # if set, revert this commit in the repo


class VoteRequest(BaseModel):
    morph_id: str
    user_id: str
    value: int                         # +1, -1, or 0 to clear


class RestoreRequest(BaseModel):
    morph_id: str
    user_id: str | None = None
    user_name: str | None = None


class TimelineItem(BaseModel):
    morph_id: str
    prompt: str
    author: str
    model: str | None                  # winning model (racer key)
    shipped: bool
    ts: str | None
    up: int
    down: int
    score: int
    my_vote: int
    restored_from: str | None = None


class TimelineResponse(BaseModel):
    items: list[TimelineItem]
    top_id: str | None                 # highest-scored node (community favorite)
    current_id: str | None             # most-recent shipped node (live version)


class ScoreboardRow(BaseModel):
    model: str
    edit_type: str
    compile_rate: float
    render_rate: float
    undo_rate: float
    quality: float                     # 1 - undo_rate
    p50_latency_ms: float
    n: int


class ModelStat(BaseModel):
    model: str
    n: int
    wins: int
    win_rate: float
    compile_rate: float
    render_rate: float
    chat_rate: float
    quality: float                     # 1 - undo_rate
    p50_latency_ms: float
    gen_ms: float
    build_ms: float
    render_ms: float


class ScoreboardKPIs(BaseModel):
    morphs: int
    candidates: int
    ship_rate: float                   # fraction of morphs that produced a winner
    quality: float                     # 1 - undo_rate overall
    compile_rate: float
    render_rate: float
    chat_rate: float
    p50_latency_ms: float


class ScoreboardResponse(BaseModel):
    kpis: ScoreboardKPIs
    models: list[ModelStat]            # per-model leaderboard
    rows: list[ScoreboardRow]          # per model x edit_type
    timeseries: list[dict]             # [{created, quality, model}] for the climbing chart
