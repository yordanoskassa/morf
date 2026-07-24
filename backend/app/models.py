"""The 3-model race. Fireworks OSS models via OpenAI SDK, logged to Braintrust. 🔒 immutable."""
from __future__ import annotations
import json
import time
import asyncio

from openai import AsyncOpenAI
from braintrust import wrap_openai

from . import config
from .schemas import MorphPlan, FileEdit
from .immutable_guard import app_context

# ------------------------------------------------------------------ client -----
# NOTE: we use the `openai` SDK only as a generic OpenAI-COMPATIBLE HTTP client; it's
# pointed at Fireworks (or the Braintrust proxy). The api_key is your FIREWORKS/BRAINTRUST
# key — NOT an OpenAI key. Built lazily so a missing key doesn't crash app boot.
_CLIENT: AsyncOpenAI | None = None


def _make_client() -> AsyncOpenAI:
    proxy = config.MODEL_GATEWAY == "braintrust_proxy"
    key = config.BRAINTRUST_API_KEY if proxy else config.FIREWORKS_API_KEY
    if not key:
        need = "BRAINTRUST_API_KEY (proxy mode)" if proxy else "FIREWORKS_API_KEY"
        raise RuntimeError(f"No model API key set — set {need} in the environment")
    if proxy:
        # One base_url change: every call logged + cached by Braintrust.
        return AsyncOpenAI(api_key=key, base_url=config.BRAINTRUST_PROXY_URL)
    # default: talk to Fireworks directly, wrap for Braintrust tracing.
    return wrap_openai(AsyncOpenAI(api_key=key, base_url=config.FIREWORKS_BASE_URL))


def get_client() -> AsyncOpenAI:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = _make_client()
    return _CLIENT

# JSON schema forced on every model so we get structured file edits, not prose.
_SCHEMA = {
    "name": "morph_plan",
    "schema": MorphPlan.model_json_schema(),
}

_SYSTEM = """You edit a Vite + React + TypeScript app that uses shadcn/ui components.
You will be given the current contents of the app files, a short history of recent
changes, and a change request.

Make SURGICAL edits. For each file, return a `search`/`replace` pair: `search` is an
EXACT snippet copied verbatim from the current file (include just enough surrounding
lines to be unique — usually 3-8 lines), `replace` is what it becomes.

HARD RULES on output size (your response is capped — exceeding it fails the whole edit):
- NEVER return a whole file in `content` for a file that already exists. Use search/replace.
- Keep each `search`/`replace` snippet SMALL — only the lines that change, not the file.
- `content` (full file) is allowed ONLY when creating a brand-new file.
Return the fewest, smallest edits that satisfy the request.

You may edit ANY file under frontend/src — components, styles, the App shell, the chat
itself. Mutability is a concept, not a partition. Only files under frontend/src are the
app; never touch backend, build config, or tooling.

THE ONE INVARIANT — the chat must survive. A change only ships if, afterwards, the app
still builds, still renders, and the source STILL CONTAINS both:
  - an element carrying the attribute  data-morph-chat
  - the string  /morph  (the chat's call to the morph API)
You may restyle, move, or restructure the chat, but you must KEEP a working chat that
preserves those two anchors. Never remove the chat or its ability to send a morph.

Other rules:
- Keep imports valid and the app compiling. Reuse shadcn components in components/ui.
- Prefer the smallest change that satisfies the request.
Respond as JSON matching the schema."""


def _build_user_prompt(prompt: str, focus: list[str], history: str) -> str:
    ctx = app_context(focus=focus)
    files_blob = "\n\n".join(f"=== {p} ===\n{c}" for p, c in ctx.items())
    hist = f"# Recent changes (most recent last)\n{history}\n\n" if history else ""
    return f"{hist}# App files (you may edit any of these)\n{files_blob}\n\n# Change request\n{prompt}"


async def generate(racer: config.Racer, prompt: str, focus: list[str], history: str = "") -> tuple[MorphPlan | None, int, str]:
    """Run one racer. Returns (plan|None, gen_ms, error)."""
    t0 = time.perf_counter()
    try:
        resp = await get_client().chat.completions.create(
            model=racer.model,
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": _build_user_prompt(prompt, focus, history)},
            ],
            response_format={"type": "json_schema", "json_schema": _SCHEMA},
            temperature=0.2,
            max_tokens=16000,   # headroom so surgical edits don't truncate into invalid JSON
        )
        gen_ms = int((time.perf_counter() - t0) * 1000)
        raw = resp.choices[0].message.content or "{}"
        plan = MorphPlan.model_validate_json(raw)
        return plan, gen_ms, ""
    except Exception as e:  # noqa: BLE001 — surface any model/parse failure per-racer
        gen_ms = int((time.perf_counter() - t0) * 1000)
        return None, gen_ms, f"{type(e).__name__}: {e}"


async def race(prompt: str, focus: list[str], history: str = "") -> list[tuple[config.Racer, MorphPlan | None, int, str]]:
    """Fan out to all 3 racers concurrently."""
    results = await asyncio.gather(*(generate(r, prompt, focus, history) for r in config.RACERS))
    return [(r, *res) for r, res in zip(config.RACERS, results)]
