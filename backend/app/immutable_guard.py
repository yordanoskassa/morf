"""The invariant guard. 🔒 kernel.

Mutability is a concept, not a partition: a morph may edit ANY file under app_root.
The kernel (machinery) is never editable. A morph only ships if the CHAT SURVIVES —
build + render + the app still contains the chat anchors (checked in the sandbox).
"""
from __future__ import annotations
import os
import json
import fnmatch
from pathlib import Path

# repo root = two levels up from this file (backend/app/ -> repo/), overridable in Docker.
REPO_ROOT = Path(os.getenv("MORPH_REPO_ROOT", str(Path(__file__).resolve().parents[2])))
_MANIFEST = REPO_ROOT / "INVARIANT.json"

_CODE_EXT = {".tsx", ".ts", ".jsx", ".js", ".css", ".html", ".json"}


def _load() -> dict:
    return json.loads(_MANIFEST.read_text())


def _norm(p: str) -> str:
    return p.replace("\\", "/").lstrip("./").lstrip("/")


def is_kernel(path: str) -> bool:
    p = _norm(path)
    return any(fnmatch.fnmatch(p, _norm(g)) for g in _load()["kernel"])


def in_app(path: str) -> bool:
    root = _norm(_load()["app_root"])
    p = _norm(path)
    return p == root or p.startswith(root + "/")


def check_files(paths: list[str]) -> tuple[bool, str | None]:
    """Allow a morph only if every path is inside the app and not the kernel."""
    for path in paths:
        if is_kernel(path):
            return False, f"'{path}' is kernel — the machinery, not part of the app"
        if not in_app(path):
            return False, f"'{path}' is outside the app ({_load()['app_root']})"
    return True, None


def anchors() -> list[str]:
    return _load().get("chat_survival", {}).get("anchors", [])


def app_context(max_bytes: int = 120_000, focus: list[str] | None = None) -> dict[str, str]:
    """Read the whole app source so a model knows what it can reshape.

    Prioritised: focused files first, then app files, then shadcn ui primitives.
    Truncated to max_bytes total.
    """
    root = REPO_ROOT / _norm(_load()["app_root"])
    if not root.exists():
        return {}
    focus = focus or []
    items: list[tuple[str, Path]] = []
    for f in root.rglob("*"):
        if not (f.is_file() and f.suffix in _CODE_EXT):
            continue
        rel = str(f.relative_to(REPO_ROOT))
        if is_kernel(rel):
            continue
        items.append((rel, f))

    def prio(item: tuple[str, Path]) -> int:
        rel = item[0]
        if rel in focus:
            return 0
        if "/components/ui/" in rel:
            return 2
        return 1

    items.sort(key=prio)
    out: dict[str, str] = {}
    total = 0
    for rel, f in items:
        try:
            text = f.read_text()
        except (UnicodeDecodeError, OSError):
            continue
        if total + len(text) > max_bytes:
            continue
        out[rel] = text
        total += len(text)
    return out
