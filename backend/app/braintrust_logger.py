"""Braintrust: log every morph as a span, update on undo, query the scoreboard. 🔒 immutable."""
from __future__ import annotations
import time
import httpx
from braintrust import init_logger

from . import config
from .schemas import CandidateResult, ScoreboardRow, ScoreboardResponse, ModelStat, ScoreboardKPIs

_logger = init_logger(project=config.BRAINTRUST_PROJECT)
_BTQL_URL = "https://api.braintrust.dev/btql"


def log_morph(prompt: str, c: CandidateResult) -> str:
    """Log one candidate as a span. Returns span id (store it for later undo feedback)."""
    with _logger.start_span(name=f"morph:{c.racer}", type="task") as span:
        span.log(
            input={"prompt": prompt, "files": [f.path for f in c.files]},
            output=c.summary,
            scores={
                "compiled": 1.0 if c.compiled else 0.0,
                "rendered": 1.0 if c.rendered else 0.0,
                "chat_ok": 1.0 if c.chat_ok else 0.0,
                "won": 1.0 if c.won else 0.0,
                "undo": 0.0,   # optimistic; flipped by log_undo if the user reverts
            },
            metrics={
                "gen_ms": c.gen_ms,
                "build_ms": c.build_ms,
                "render_ms": c.render_ms,
                "total_ms": c.total_ms,
            },
            metadata={
                "kind": "morph",          # distinguishes our spans from wrap_openai's raw LLM spans
                "model": c.racer,
                "model_id": c.model,
                "edit_type": c.edit_type or "other",
                "blocked": c.blocked,
            },
        )
        return span.id


def log_undo(span_id: str) -> None:
    """User hit undo — update the already-logged span's undo score to 1."""
    _logger.log_feedback(
        id=span_id,
        scores={"undo": 1.0},
        comment="user undid the morph within the undo window",
    )


_EMPTY_KPIS = ScoreboardKPIs(morphs=0, candidates=0, ship_rate=0, quality=0,
                             compile_rate=0, render_rate=0, chat_rate=0, p50_latency_ms=0)


async def _btql(http, query: str) -> list[dict]:
    r = await http.post(_BTQL_URL, headers={"Authorization": f"Bearer {config.BRAINTRUST_API_KEY}"},
                        json={"query": query, "fmt": "json"})
    return r.json().get("data", []) if r.status_code == 200 else []


_cache: dict = {"t": -1e9, "data": None}
_CACHE_TTL = 12.0   # seconds — keep us under Braintrust's 20 BTQL req / 60s limit


async def scoreboard() -> ScoreboardResponse:
    """Rich live dashboard: overall KPIs, per-model leaderboard, per edit-type, timeseries.
    Cached briefly and limited to 3 BTQL queries to respect the rate limit."""
    if not config.BRAINTRUST_PROJECT_ID:
        return ScoreboardResponse(kpis=_EMPTY_KPIS, models=[], rows=[], timeseries=[])

    now = time.monotonic()
    if _cache["data"] is not None and now - _cache["t"] < _CACHE_TTL:
        return _cache["data"]

    pid = config.BRAINTRUST_PROJECT_ID
    win = "created > now() - interval 7 day AND metadata.kind = 'morph'"
    n_racers = max(1, len(config.RACERS))

    # 3 queries only; overall KPIs are derived from the per-model rows in Python.
    q_models = f"""SELECT metadata.model AS model, count(*) AS n, sum(scores.won) AS wins,
        avg(scores.compiled) AS c, avg(scores.rendered) AS r, avg(scores.chat_ok) AS ch,
        avg(scores.undo) AS u, avg(metrics.total_ms) AS lat,
        avg(metrics.gen_ms) AS gen, avg(metrics.build_ms) AS build, avg(metrics.render_ms) AS rend
        FROM project_logs('{pid}') WHERE {win} GROUP BY metadata.model"""

    q_edit = f"""SELECT metadata.model AS model, metadata.edit_type AS edit_type,
        avg(scores.compiled) AS compile_rate, avg(scores.rendered) AS render_rate,
        avg(scores.undo) AS undo_rate, avg(metrics.total_ms) AS p50_latency_ms, count(*) AS n
        FROM project_logs('{pid}') WHERE {win} GROUP BY metadata.model, metadata.edit_type"""

    q_ts = f"""SELECT created, metadata.model AS model, scores.undo AS undo
        FROM project_logs('{pid}') WHERE {win} ORDER BY created ASC LIMIT 500"""

    async with httpx.AsyncClient(timeout=15.0) as http:
        models_d, edit_d, ts_d = (
            await _btql(http, q_models), await _btql(http, q_edit), await _btql(http, q_ts),
        )

    # derive overall KPIs from the per-model rows (weighted by n)
    cand = sum(int(m.get("n") or 0) for m in models_d)
    morphs = round(cand / n_racers)
    wins = sum(int(m.get("wins") or 0) for m in models_d)

    def wavg(key: str) -> float:
        if not cand:
            return 0.0
        return sum((m.get(key) or 0.0) * int(m.get("n") or 0) for m in models_d) / cand

    kpis = ScoreboardKPIs(
        morphs=morphs, candidates=cand,
        ship_rate=(wins / morphs) if morphs else 0.0,
        quality=1.0 - wavg("u"),
        compile_rate=wavg("c"), render_rate=wavg("r"), chat_rate=wavg("ch"),
        p50_latency_ms=wavg("lat"),
    )

    models = []
    for m in models_d:
        n = int(m.get("n") or 0)
        w = int(m.get("wins") or 0)
        models.append(ModelStat(
            model=m.get("model") or "?", n=n, wins=w, win_rate=(w / n) if n else 0.0,
            compile_rate=m.get("c") or 0.0, render_rate=m.get("r") or 0.0, chat_rate=m.get("ch") or 0.0,
            quality=1.0 - (m.get("u") or 0.0), p50_latency_ms=m.get("lat") or 0.0,
            gen_ms=m.get("gen") or 0.0, build_ms=m.get("build") or 0.0, render_ms=m.get("rend") or 0.0,
        ))
    models.sort(key=lambda x: (x.wins, x.quality), reverse=True)

    rows = []
    for r in edit_d:
        undo = r.get("undo_rate") or 0.0
        rows.append(ScoreboardRow(
            model=r.get("model") or "?", edit_type=r.get("edit_type") or "?",
            compile_rate=r.get("compile_rate") or 0.0, render_rate=r.get("render_rate") or 0.0,
            undo_rate=undo, quality=1.0 - undo, p50_latency_ms=r.get("p50_latency_ms") or 0.0,
            n=int(r.get("n") or 0),
        ))
    timeseries = [
        {"created": r.get("created"), "model": r.get("model"), "quality": 1.0 - (r.get("undo") or 0.0)}
        for r in ts_d
    ]
    result = ScoreboardResponse(kpis=kpis, models=models, rows=rows, timeseries=timeseries)
    _cache["t"], _cache["data"] = now, result
    return result
