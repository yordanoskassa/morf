"""Braintrust: log every morph as a span, update on undo, query the scoreboard. 🔒 immutable."""
from __future__ import annotations
import httpx
from braintrust import init_logger

from . import config
from .schemas import CandidateResult, ScoreboardRow, ScoreboardResponse

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


async def scoreboard() -> ScoreboardResponse:
    """Aggregate morph quality per model + edit_type, plus a climbing timeseries."""
    if not config.BRAINTRUST_PROJECT_ID:
        return ScoreboardResponse(rows=[], timeseries=[])

    pid = config.BRAINTRUST_PROJECT_ID
    agg_query = f"""
        SELECT metadata.model AS model,
               metadata.edit_type AS edit_type,
               avg(scores.compiled) AS compile_rate,
               avg(scores.rendered) AS render_rate,
               avg(scores.undo)     AS undo_rate,
               avg(metrics.total_ms) AS p50_latency_ms,
               count(*) AS n
        FROM project_logs('{pid}')
        WHERE created > now() - interval 1 day AND metadata.kind = 'morph'
        GROUP BY metadata.model, metadata.edit_type
    """
    ts_query = f"""
        SELECT created, metadata.model AS model, scores.undo AS undo
        FROM project_logs('{pid}')
        WHERE created > now() - interval 1 day AND metadata.kind = 'morph'
        ORDER BY created ASC
        LIMIT 500
    """
    headers = {"Authorization": f"Bearer {config.BRAINTRUST_API_KEY}"}
    async with httpx.AsyncClient(timeout=15.0) as http:
        agg = await http.post(_BTQL_URL, headers=headers, json={"query": agg_query, "fmt": "json"})
        ts = await http.post(_BTQL_URL, headers=headers, json={"query": ts_query, "fmt": "json"})

    rows = []
    for r in agg.json().get("data", []):
        undo = r.get("undo_rate") or 0.0
        rows.append(ScoreboardRow(
            model=r.get("model") or "?",
            edit_type=r.get("edit_type") or "?",
            compile_rate=r.get("compile_rate") or 0.0,
            render_rate=r.get("render_rate") or 0.0,
            undo_rate=undo,
            quality=1.0 - undo,
            p50_latency_ms=r.get("p50_latency_ms") or 0.0,
            n=int(r.get("n") or 0),
        ))
    timeseries = [
        {"created": r.get("created"), "model": r.get("model"), "quality": 1.0 - (r.get("undo") or 0.0)}
        for r in ts.json().get("data", [])
    ]
    return ScoreboardResponse(rows=rows, timeseries=timeseries)
