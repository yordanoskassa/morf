"""Orchestrates one morph: guard -> race 3 models -> sandbox each -> score -> ship. 🔒 immutable."""
from __future__ import annotations
import asyncio

from . import config, models, daytona_runner, braintrust_logger
from .immutable_guard import check_files
from .schemas import MorphRequest, MorphResponse, CandidateResult, MorphPlan


def _composite(c: CandidateResult) -> float:
    """Rank score: must compile + render; faster is better as a tiebreak."""
    base = 0.5 * (1 if c.compiled else 0) + 0.5 * (1 if c.rendered else 0)
    speed = 0.0
    if c.total_ms:
        speed = max(0.0, 1.0 - c.total_ms / 60_000)  # up to +1 for <0s, ~0 by 60s
    return round(base + 0.001 * speed, 4)  # speed only breaks ties


async def _run_candidate(prompt: str, racer, plan: MorphPlan | None, gen_ms: int, err: str) -> CandidateResult:
    if plan is None:
        c = CandidateResult(racer=racer.key, model=racer.model, edit_type="other",
                            summary=f"model error: {err}", files=[], gen_ms=gen_ms)
        c.total_ms = gen_ms
        return c

    c = CandidateResult(
        racer=racer.key, model=racer.model, edit_type=plan.edit_type,
        summary=plan.summary, files=plan.files, gen_ms=gen_ms,
    )

    # guard BEFORE touching a sandbox
    ok, reason = check_files([f.path for f in plan.files])
    if not ok:
        c.blocked = True
        c.blocked_reason = reason
        c.total_ms = gen_ms
        return c

    ev = await daytona_runner.evaluate(plan.files)
    c.compiled, c.rendered = ev.compiled, ev.rendered
    c.build_ms, c.render_ms = ev.build_ms, ev.render_ms
    c.build_log, c.preview_url = ev.build_log, ev.preview_url
    c.total_ms = gen_ms + ev.build_ms + ev.render_ms
    c.score = _composite(c)
    return c


async def run_morph(req: MorphRequest) -> MorphResponse:
    # 1. race the 3 models
    raced = await models.race(req.prompt, req.focus)

    # 2. evaluate each candidate concurrently (guard -> sandbox)
    candidates = await asyncio.gather(
        *(_run_candidate(req.prompt, r, plan, gen_ms, err) for r, plan, gen_ms, err in raced)
    )

    # 3. log every candidate as a Braintrust span, capture ids for undo feedback
    for c in candidates:
        try:
            c.span_id = braintrust_logger.log_morph(req.prompt, c)
        except Exception:  # noqa: BLE001 — logging must never break a morph
            c.span_id = None

    # 4. pick winner: only ones that compiled AND rendered are eligible
    eligible = [c for c in candidates if c.compiled and c.rendered and not c.blocked]
    winner = max(eligible, key=_composite) if eligible else None

    resp = MorphResponse(winner=winner, candidates=sorted(candidates, key=_composite, reverse=True))

    # 5. auto-ship the winner (user chose auto-ship + hot-reload)
    if winner is not None:
        sha = await daytona_runner.ship(winner.files, message=f"morph: {winner.summary}")
        resp.shipped = sha is not None
        resp.commit_sha = sha
    return resp
