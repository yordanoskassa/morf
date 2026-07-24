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
def _client() -> AsyncOpenAI:
    if config.MODEL_GATEWAY == "braintrust_proxy":
        # One base_url change: every call logged + cached by Braintrust.
        # Requires the Fireworks key configured as a secret in Braintrust org settings.
        c = AsyncOpenAI(api_key=config.BRAINTRUST_API_KEY, base_url=config.BRAINTRUST_PROXY_URL)
        return c
    # default: talk to Fireworks directly, wrap for Braintrust tracing.
    c = AsyncOpenAI(api_key=config.FIREWORKS_API_KEY, base_url=config.FIREWORKS_BASE_URL)
    return wrap_openai(c)


CLIENT = _client()

# JSON schema forced on every model so we get structured file edits, not prose.
_SCHEMA = {
    "name": "morph_plan",
    "schema": MorphPlan.model_json_schema(),
}

_SYSTEM = """You edit a Vite + React + TypeScript app that uses shadcn/ui components.
You will be given the current contents of the app files and a change request.
Return ONLY files you need to create or overwrite, with their COMPLETE new content.

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


def _build_user_prompt(prompt: str, focus: list[str]) -> str:
    ctx = app_context(focus=focus)
    files_blob = "\n\n".join(f"=== {p} ===\n{c}" for p, c in ctx.items())
    return f"# App files (you may edit any of these)\n{files_blob}\n\n# Change request\n{prompt}"


async def generate(racer: config.Racer, prompt: str, focus: list[str]) -> tuple[MorphPlan | None, int, str]:
    """Run one racer. Returns (plan|None, gen_ms, error)."""
    t0 = time.perf_counter()
    try:
        resp = await CLIENT.chat.completions.create(
            model=racer.model,
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": _build_user_prompt(prompt, focus)},
            ],
            response_format={"type": "json_schema", "json_schema": _SCHEMA},
            temperature=0.2,
            max_tokens=8000,
        )
        gen_ms = int((time.perf_counter() - t0) * 1000)
        raw = resp.choices[0].message.content or "{}"
        plan = MorphPlan.model_validate_json(raw)
        return plan, gen_ms, ""
    except Exception as e:  # noqa: BLE001 — surface any model/parse failure per-racer
        gen_ms = int((time.perf_counter() - t0) * 1000)
        return None, gen_ms, f"{type(e).__name__}: {e}"


async def race(prompt: str, focus: list[str]) -> list[tuple[config.Racer, MorphPlan | None, int, str]]:
    """Fan out to all 3 racers concurrently."""
    results = await asyncio.gather(*(generate(r, prompt, focus) for r in config.RACERS))
    return [(r, *res) for r, res in zip(config.RACERS, results)]
