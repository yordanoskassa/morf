"""Rejects any morph that touches a protected path. 🔒 immutable.

The whole safety story of a *self-editing* app: a morph can only ever change files
under the mutable roots, and never a file listed in IMMUTABLE.json. We check this
BEFORE a candidate ever reaches a Daytona sandbox.
"""
from __future__ import annotations
import os
import json
import fnmatch
from pathlib import Path

# repo root = two levels up from this file (backend/app/ -> repo/), overridable in Docker.
REPO_ROOT = Path(os.getenv("MORPH_REPO_ROOT", str(Path(__file__).resolve().parents[2])))
_MANIFEST = REPO_ROOT / "IMMUTABLE.json"


def _load() -> dict:
    return json.loads(_MANIFEST.read_text())


def _norm(p: str) -> str:
    # normalise to forward-slash, strip leading ./ and /
    return p.replace("\\", "/").lstrip("./").lstrip("/")


def is_protected(path: str) -> bool:
    protected = _load()["protected"]
    p = _norm(path)
    return any(fnmatch.fnmatch(p, _norm(glob)) for glob in protected)


def is_mutable(path: str) -> bool:
    roots = _load().get("mutable_roots", [])
    p = _norm(path)
    return any(fnmatch.fnmatch(p, _norm(glob)) for glob in roots)


def check_files(paths: list[str]) -> tuple[bool, str | None]:
    """Return (ok, reason). ok=False if any path is protected or outside mutable roots."""
    for path in paths:
        if is_protected(path):
            return False, f"'{path}' is immutable"
        if not is_mutable(path):
            return False, f"'{path}' is outside the mutable roots"
    return True, None


def mutable_context(max_bytes: int = 60_000) -> dict[str, str]:
    """Read current mutable-root files so a model knows what it's editing.

    Returns {relative_path: content}. Truncated to max_bytes total to keep prompts sane.
    """
    roots = _load().get("mutable_roots", [])
    out: dict[str, str] = {}
    total = 0
    for glob in roots:
        # expand the glob under repo root
        for f in REPO_ROOT.glob(_norm(glob)):
            if not f.is_file():
                continue
            rel = str(f.relative_to(REPO_ROOT))
            if is_protected(rel):
                continue
            try:
                text = f.read_text()
            except (UnicodeDecodeError, OSError):
                continue
            if total + len(text) > max_bytes:
                continue
            out[rel] = text
            total += len(text)
    return out
