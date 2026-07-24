"""MongoDB — the consistent operational store. Every morph is persisted; the scoreboard,
conversation memory, and undo all read from here (single source of truth). 🔒 kernel."""
from __future__ import annotations
from datetime import datetime, timedelta, timezone

import certifi
from motor.motor_asyncio import AsyncIOMotorClient

from . import config
from .schemas import ScoreboardResponse, ScoreboardKPIs, ModelStat, ScoreboardRow

_client: AsyncIOMotorClient | None = (
    AsyncIOMotorClient(config.MONGODB_URI, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=8000)
    if config.MONGODB_URI else None
)
_db = _client[config.MONGODB_DB] if _client is not None else None


def enabled() -> bool:
    return _db is not None


async def ping() -> bool:
    if _db is None:
        return False
    try:
        await _db.command("ping")
        return True
    except Exception:  # noqa: BLE001
        return False


async def save_morph(doc: dict) -> str | None:
    if _db is None:
        return None
    doc = {**doc, "ts": datetime.now(timezone.utc)}
    doc.setdefault("votes", {})
    doc.setdefault("author", "anon")
    try:
        res = await _db.morphs.insert_one(doc)
        return str(res.inserted_id)
    except Exception:  # noqa: BLE001 — persistence must never break a morph
        return None


async def recent_prompts(n: int = 8) -> list[dict]:
    """Most-recent morphs (oldest→newest) for the conversation-memory preamble."""
    if _db is None:
        return []
    try:
        cur = _db.morphs.find({}, {"prompt": 1, "winner": 1, "shipped": 1}).sort("ts", -1).limit(n)
        docs = [d async for d in cur]
        return list(reversed(docs))
    except Exception:  # noqa: BLE001
        return []


async def mark_undo(span_id: str) -> None:
    if _db is None:
        return
    try:
        await _db.morphs.update_one({"winner.span_id": span_id}, {"$set": {"undone": True}})
    except Exception:  # noqa: BLE001
        pass


async def add_vote(morph_id: str, user_id: str, value: int) -> None:
    if _db is None:
        return
    from bson import ObjectId
    try:
        oid = ObjectId(morph_id)
    except Exception:  # noqa: BLE001
        return
    try:
        if value == 0:
            await _db.morphs.update_one({"_id": oid}, {"$unset": {f"votes.{user_id}": ""}})
        else:
            await _db.morphs.update_one({"_id": oid}, {"$set": {f"votes.{user_id}": 1 if value > 0 else -1}})
    except Exception:  # noqa: BLE001
        pass


async def get_morph(morph_id: str) -> dict | None:
    if _db is None:
        return None
    from bson import ObjectId
    try:
        return await _db.morphs.find_one({"_id": ObjectId(morph_id)})
    except Exception:  # noqa: BLE001
        return None


async def timeline(user_id: str, limit: int = 60) -> dict:
    """All morphs newest→oldest with vote tallies; plus the top-voted and current ids."""
    if _db is None:
        return {"items": [], "top_id": None, "current_id": None}
    try:
        cur = _db.morphs.find({}).sort("ts", -1).limit(limit)
        docs = [d async for d in cur]
    except Exception:  # noqa: BLE001
        return {"items": [], "top_id": None, "current_id": None}

    items = []
    for d in docs:
        votes = d.get("votes", {}) or {}
        up = sum(1 for v in votes.values() if v > 0)
        down = sum(1 for v in votes.values() if v < 0)
        w = d.get("winner") or {}
        items.append({
            "morph_id": str(d["_id"]), "prompt": d.get("prompt", ""),
            "author": d.get("author", "anon"), "model": w.get("racer"),
            "shipped": bool(d.get("shipped")),
            "ts": d["ts"].isoformat() if d.get("ts") else None,
            "up": up, "down": down, "score": up - down,
            "my_vote": int(votes.get(user_id, 0)),
            "restored_from": d.get("restored_from"),
        })
    shipped = [it for it in items if it["shipped"]]
    top = max(shipped, key=lambda it: it["score"], default=None) if shipped else None
    current = shipped[0] if shipped else None  # items are newest-first
    return {"items": items, "top_id": top["morph_id"] if top else None,
            "current_id": current["morph_id"] if current else None}


async def fetch_recent(days: int = 7) -> list[dict]:
    if _db is None:
        return []
    since = datetime.now(timezone.utc) - timedelta(days=days)
    try:
        cur = _db.morphs.find({"ts": {"$gte": since}}).sort("ts", 1)
        return [d async for d in cur]
    except Exception:  # noqa: BLE001
        return []


def _mean(vals: list[float]) -> float:
    return sum(vals) / len(vals) if vals else 0.0


async def scoreboard() -> ScoreboardResponse:
    """Aggregate the scoreboard from Mongo — one consistent source of truth."""
    docs = await fetch_recent(7)
    cands = [c for d in docs for c in d.get("candidates", [])]
    n_racers = max(1, len(config.RACERS))

    shipped = [d for d in docs if d.get("shipped")]
    undone = [d for d in shipped if d.get("undone")]
    morphs = len(docs)

    kpis = ScoreboardKPIs(
        morphs=morphs, candidates=len(cands),
        ship_rate=(len(shipped) / morphs) if morphs else 0.0,
        quality=1.0 - (len(undone) / len(shipped)) if shipped else 1.0,
        compile_rate=_mean([1.0 if c.get("compiled") else 0.0 for c in cands]),
        render_rate=_mean([1.0 if c.get("rendered") else 0.0 for c in cands]),
        chat_rate=_mean([1.0 if c.get("chat_ok") else 0.0 for c in cands]),
        p50_latency_ms=_mean([c.get("total_ms", 0) for c in cands]),
    )

    # per-model leaderboard
    by_model: dict[str, list[dict]] = {}
    for c in cands:
        by_model.setdefault(c.get("racer", "?"), []).append(c)
    undo_by_model: dict[str, int] = {}
    wins_by_model: dict[str, int] = {}
    for d in shipped:
        w = (d.get("winner") or {}).get("racer")
        if w:
            wins_by_model[w] = wins_by_model.get(w, 0) + 1
            if d.get("undone"):
                undo_by_model[w] = undo_by_model.get(w, 0) + 1
    models = []
    for racer, cs in by_model.items():
        wins = sum(1 for c in cs if c.get("won"))
        wq = wins_by_model.get(racer, 0)
        models.append(ModelStat(
            model=racer, n=len(cs), wins=wins, win_rate=wins / len(cs) if cs else 0.0,
            compile_rate=_mean([1.0 if c.get("compiled") else 0.0 for c in cs]),
            render_rate=_mean([1.0 if c.get("rendered") else 0.0 for c in cs]),
            chat_rate=_mean([1.0 if c.get("chat_ok") else 0.0 for c in cs]),
            quality=1.0 - (undo_by_model.get(racer, 0) / wq) if wq else 1.0,
            p50_latency_ms=_mean([c.get("total_ms", 0) for c in cs]),
            gen_ms=_mean([c.get("gen_ms", 0) for c in cs]),
            build_ms=_mean([c.get("build_ms", 0) for c in cs]),
            render_ms=_mean([c.get("render_ms", 0) for c in cs]),
        ))
    models.sort(key=lambda m: (m.wins, m.quality), reverse=True)

    # per model x edit-type (quality = success rate here)
    by_edit: dict[tuple, list[dict]] = {}
    for c in cands:
        by_edit.setdefault((c.get("racer", "?"), c.get("edit_type", "?")), []).append(c)
    rows = []
    for (racer, edit), cs in by_edit.items():
        rows.append(ScoreboardRow(
            model=racer, edit_type=edit,
            compile_rate=_mean([1.0 if c.get("compiled") else 0.0 for c in cs]),
            render_rate=_mean([1.0 if c.get("rendered") else 0.0 for c in cs]),
            undo_rate=0.0,
            quality=_mean([1.0 if (c.get("compiled") and c.get("rendered") and c.get("chat_ok")) else 0.0 for c in cs]),
            p50_latency_ms=_mean([c.get("total_ms", 0) for c in cs]), n=len(cs),
        ))

    timeseries = [
        {"created": d["ts"].isoformat() if d.get("ts") else None,
         "model": (d.get("winner") or {}).get("racer", "?"),
         "quality": 0.0 if d.get("undone") else 1.0}
        for d in shipped
    ]
    return ScoreboardResponse(kpis=kpis, models=models, rows=rows, timeseries=timeseries)
