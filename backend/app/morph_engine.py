"""Orchestrates one morph: guard -> race 3 models -> sandbox each -> score -> ship. 🔒 immutable."""
from __future__ import annotations
import asyncio

from . import config, models, daytona_runner, braintrust_logger, store
from .immutable_guard import check_files, is_kernel, in_app, REPO_ROOT
from .schemas import MorphRequest, MorphResponse, CandidateResult, MorphPlan, FileEdit


# --- conversation memory: a rolling one-line log of recent morphs, from Mongo (cheap) ---
async def _history_text() -> str:
    docs = await store.recent_prompts(8)
    lines = []
    for d in docs:
        w = d.get("winner")
        outcome = f"shipped by {w['racer']} ({w.get('summary', '')})" if w else "no candidate survived"
        lines.append(f'- "{d.get("prompt", "")}" → {outcome}')
    return "\n".join(lines)


def _morph_doc(prompt: str, candidates: list[CandidateResult], winner: CandidateResult | None, sha: str | None) -> dict:
    return {
        "prompt": prompt,
        "shipped": sha is not None,
        "commit_sha": sha,
        "undone": False,
        "winner": None if winner is None else {
            "racer": winner.racer, "model": winner.model, "summary": winner.summary,
            "total_ms": winner.total_ms, "span_id": winner.span_id, "commit_sha": sha,
        },
        "candidates": [
            {"racer": c.racer, "model": c.model, "edit_type": c.edit_type,
             "compiled": c.compiled, "rendered": c.rendered, "chat_ok": c.chat_ok,
             "blocked": c.blocked, "won": c.won, "gen_ms": c.gen_ms, "build_ms": c.build_ms,
             "render_ms": c.render_ms, "total_ms": c.total_ms, "span_id": c.span_id}
            for c in candidates
        ],
    }


def _resolve_files(plan: MorphPlan) -> list[FileEdit]:
    """Turn the model's surgical edits into full-content files by applying search/replace
    against the current local files. Raises on a search miss (candidate then fails)."""
    by_path: dict[str, list[FileEdit]] = {}
    for e in plan.files:
        by_path.setdefault(e.path, []).append(e)

    resolved: list[FileEdit] = []
    for path in dict.fromkeys(e.path for e in plan.files):  # preserve first-seen order
        p = REPO_ROOT / path
        content = p.read_text() if p.exists() else None
        for e in by_path[path]:
            if e.search is None and e.content is not None:
                content = e.content                       # new file / full rewrite
            elif e.search is not None:
                if content is None:
                    raise ValueError(f"search edit on missing file {path}")
                if e.search not in content:
                    raise ValueError(f"search snippet not found in {path}")
                content = content.replace(e.search, e.replace or "", 1)
            else:
                raise ValueError(f"empty edit for {path}")
        if content is None:
            raise ValueError(f"no content produced for {path}")
        resolved.append(FileEdit(path=path, content=content))
    return resolved


def _apply_local(files: list[FileEdit]) -> None:
    """Write winner files to the LOCAL working copy so the running Vite dev server
    HMR-reloads. Paths are already guard-checked, but re-verify defensively."""
    for f in files:
        if is_kernel(f.path) or not in_app(f.path):
            continue
        dest = REPO_ROOT / f.path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(f.content)


def _composite(c: CandidateResult) -> float:
    """Rank score: must compile + render + keep the chat alive; faster breaks ties."""
    base = ((1 if c.compiled else 0) + (1 if c.rendered else 0) + (1 if c.chat_ok else 0)) / 3
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

    try:
        resolved = _resolve_files(plan)
    except Exception as e:  # noqa: BLE001
        c.blocked, c.blocked_reason, c.total_ms = True, f"edit did not apply: {e}", gen_ms
        return c
    c.files = resolved

    ev = await daytona_runner.evaluate(resolved)
    c.compiled, c.rendered, c.chat_ok = ev.compiled, ev.rendered, ev.chat_ok
    c.build_ms, c.render_ms = ev.build_ms, ev.render_ms
    c.build_log, c.preview_url = ev.build_log, ev.preview_url
    c.total_ms = gen_ms + ev.build_ms + ev.render_ms
    c.score = _composite(c)
    return c


async def run_morph(req: MorphRequest) -> MorphResponse:
    # 1. race the 3 models (with a short memory of recent changes)
    raced = await models.race(req.prompt, req.focus, await _history_text())

    # warm the baked image once so concurrent sandbox creates don't race the build
    await daytona_runner.ensure_warm()

    # 2. evaluate each candidate concurrently (guard -> sandbox)
    candidates = await asyncio.gather(
        *(_run_candidate(req.prompt, r, plan, gen_ms, err) for r, plan, gen_ms, err in raced)
    )

    # 3. pick winner: must compile, render, AND keep the chat alive (survival invariant)
    eligible = [c for c in candidates if c.compiled and c.rendered and c.chat_ok and not c.blocked]
    winner = max(eligible, key=_composite) if eligible else None
    if winner is not None:
        winner.won = True

    # 4. log every candidate as a Braintrust span, capture ids for undo feedback
    for c in candidates:
        try:
            c.span_id = braintrust_logger.log_morph(req.prompt, c)
        except Exception:  # noqa: BLE001 — logging must never break a morph
            c.span_id = None

    resp = MorphResponse(winner=winner, candidates=sorted(candidates, key=_composite, reverse=True))

    # 5. auto-ship the winner (user chose auto-ship + hot-reload)
    if winner is not None:
        # write to the local working copy FIRST → Vite HMR reloads the stage instantly
        _apply_local(winner.files)
        # then push to GitHub as the shipped record
        sha = await daytona_runner.ship(winner.files, message=f"morph: {winner.summary}")
        resp.shipped = sha is not None
        resp.commit_sha = sha
    await store.save_morph(_morph_doc(req.prompt, candidates, winner, resp.commit_sha))
    return resp


# ----------------------------------------------------------------------------
# Streaming variant — emits detailed live progress events (for the log console).
# ----------------------------------------------------------------------------
async def _candidate_stream(emit, racer, prompt: str, focus: list[str], history: str) -> CandidateResult:
    await emit({"type": "gen_start", "racer": racer.key, "role": racer.role})
    plan, gen_ms, err = await models.generate(racer, prompt, focus, history)
    if plan is None:
        await emit({"type": "gen_fail", "racer": racer.key, "gen_ms": gen_ms, "error": err})
        c = CandidateResult(racer=racer.key, model=racer.model, edit_type="other",
                            summary=f"model error: {err}", files=[], gen_ms=gen_ms)
        c.total_ms = gen_ms
        return c

    await emit({"type": "gen_done", "racer": racer.key, "gen_ms": gen_ms,
                "edit_type": plan.edit_type, "summary": plan.summary,
                "files": [f.path for f in plan.files]})
    c = CandidateResult(racer=racer.key, model=racer.model, edit_type=plan.edit_type,
                        summary=plan.summary, files=plan.files, gen_ms=gen_ms)

    ok, reason = check_files([f.path for f in plan.files])
    if not ok:
        c.blocked, c.blocked_reason, c.total_ms = True, reason, gen_ms
        await emit({"type": "blocked", "racer": racer.key, "reason": reason})
        return c

    # apply the surgical edits against current files → full-content files to build
    try:
        resolved = _resolve_files(plan)
    except Exception as e:  # noqa: BLE001 — bad search snippet etc → candidate fails
        c.blocked, c.blocked_reason, c.total_ms = True, f"edit did not apply: {e}", gen_ms
        await emit({"type": "blocked", "racer": racer.key, "reason": c.blocked_reason})
        return c
    c.files = resolved

    async def emit_step(phase: str, detail: str = ""):
        await emit({"type": "step", "racer": racer.key, "phase": phase, "detail": detail})

    ev = await daytona_runner.evaluate(resolved, emit_step=emit_step)
    c.compiled, c.rendered, c.chat_ok = ev.compiled, ev.rendered, ev.chat_ok
    c.build_ms, c.render_ms = ev.build_ms, ev.render_ms
    c.build_log, c.preview_url = ev.build_log, ev.preview_url
    c.total_ms = gen_ms + ev.build_ms + ev.render_ms
    c.score = _composite(c)
    await emit({"type": "eval_done", "racer": racer.key, "compiled": c.compiled,
                "rendered": c.rendered, "chat_ok": c.chat_ok, "total_ms": c.total_ms,
                "preview_url": c.preview_url, "score": c.score})
    return c


async def run_morph_stream(req: MorphRequest):
    """Async generator of progress events. Terminates with a 'done' event carrying
    the full MorphResponse."""
    q: asyncio.Queue = asyncio.Queue()

    async def emit(ev: dict):
        await q.put(ev)

    async def orchestrate():
        try:
            await emit({"type": "start", "prompt": req.prompt,
                        "racers": [{"key": r.key, "role": r.role} for r in config.RACERS]})
            if not daytona_runner.is_warm():
                await emit({"type": "warming", "detail": "warming the sandbox image (first run only)"})
                await daytona_runner.ensure_warm()
            hist = await _history_text()
            cands = await asyncio.gather(
                *(_candidate_stream(emit, r, req.prompt, req.focus, hist) for r in config.RACERS)
            )
            eligible = [c for c in cands if c.compiled and c.rendered and c.chat_ok and not c.blocked]
            winner = max(eligible, key=_composite) if eligible else None
            if winner is not None:
                winner.won = True

            for c in cands:
                try:
                    c.span_id = braintrust_logger.log_morph(req.prompt, c)
                except Exception:  # noqa: BLE001
                    c.span_id = None
            resp = MorphResponse(winner=winner, candidates=sorted(cands, key=_composite, reverse=True))

            if winner is not None:
                await emit({"type": "winner", "racer": winner.racer, "summary": winner.summary,
                            "total_ms": winner.total_ms})
                _apply_local(winner.files)
                await emit({"type": "applied", "detail": "written locally — HMR reloading"})
                await emit({"type": "shipping", "detail": "pushing to GitHub"})
                sha = await daytona_runner.ship(winner.files, message=f"morph: {winner.summary}")
                resp.shipped, resp.commit_sha = sha is not None, sha
                await emit({"type": "shipped", "commit_sha": sha, "ok": sha is not None})
            else:
                await emit({"type": "no_winner", "detail": "no candidate compiled + rendered + kept the chat"})

            await store.save_morph(_morph_doc(req.prompt, cands, winner, resp.commit_sha))
            await emit({"type": "done", "result": resp.model_dump()})
        except Exception as e:  # noqa: BLE001
            await emit({"type": "error", "error": f"{type(e).__name__}: {e}"})
        finally:
            await q.put(None)

    task = asyncio.create_task(orchestrate())
    try:
        while True:
            ev = await q.get()
            if ev is None:
                break
            yield ev
    finally:
        if not task.done():
            task.cancel()
