"""Daytona sandbox: apply a candidate diff -> build -> render-check -> push. 🔒 immutable.

We time each step ourselves — the Daytona SDK exposes no latency field on exec().
"""
from __future__ import annotations
import time
import shlex
import asyncio
from dataclasses import dataclass, field

import httpx
from daytona import (
    AsyncDaytona,
    DaytonaConfig,
    CreateSandboxFromSnapshotParams,
    CreateSandboxFromImageParams,
    Image,
    Resources,
    FileUpload,
    SessionExecuteRequest,
)

from . import config
from .immutable_guard import anchors
from .schemas import FileEdit


# Deps baked into a cached image (built once, reused ~24h) → candidates never install.
# Bump config.DEPS_VERSION to bust the cache when package.json changes.
def _baked_image() -> Image:
    return (
        Image.base(config.DAYTONA_IMAGE)
        .workdir("/home/daytona")
        .run_commands(
            f"echo deps-v{config.DEPS_VERSION}",
            f"git clone --depth 1 https://github.com/{config.GITHUB_REPO}.git repo",
            f"cd repo/{config.APP_SUBDIR} && npm install --no-audit --no-fund",
        )
    )


@dataclass
class EvalOut:
    compiled: bool = False
    rendered: bool = False
    chat_ok: bool = False
    build_ms: int = 0
    render_ms: int = 0
    build_log: str = ""
    preview_url: str | None = None
    error: str = ""


def _daytona() -> AsyncDaytona:
    return AsyncDaytona(DaytonaConfig(api_key=config.DAYTONA_API_KEY))


async def _create(daytona, keep: bool):
    """Create a sandbox from the warm baked image (repo + node_modules pre-installed)."""
    if config.DAYTONA_MODE == "snapshot":
        return await daytona.create(CreateSandboxFromSnapshotParams(
            snapshot=config.DAYTONA_SNAPSHOT, ephemeral=True, auto_stop_interval=0,
        ))
    # Tier cap is 10GiB total memory; 3 racers must fit → 3GiB each (9GiB total).
    return await daytona.create(CreateSandboxFromImageParams(
        image=_baked_image(),
        resources=Resources(cpu=2, memory=3, disk=5),
        ephemeral=True,
        auto_stop_interval=0,
    ))


async def _sync_repo(sandbox) -> None:
    """The baked repo may be behind main; fast-forward it. node_modules stays baked."""
    await sandbox.process.exec(
        "cd repo && git fetch --depth 1 origin main && git reset --hard FETCH_HEAD",
        timeout=90,
    )


_warm_lock = asyncio.Lock()
_warmed = False


async def ensure_warm() -> None:
    """Build + cache the baked image ONCE (first run) so the 3 concurrent candidate
    creates reuse the cache instead of racing the same image build."""
    global _warmed
    if _warmed or config.DAYTONA_MODE == "snapshot":
        return
    async with _warm_lock:
        if _warmed:
            return
        daytona = _daytona()
        sb = None
        try:
            async with daytona:
                sb = await _create(daytona, keep=False)
                await sb.delete()
                sb = None
            _warmed = True
        except Exception:  # noqa: BLE001 — don't block morphs forever if warmup fails
            if sb is not None:
                try:
                    await sb.delete()
                except Exception:  # noqa: BLE001
                    pass


def is_warm() -> bool:
    return _warmed


def _repo_url_with_token() -> str:
    # https auth: embed PAT so clone/push need no interactive creds
    return f"https://{config.GITHUB_USER}:{config.GITHUB_TOKEN}@github.com/{config.GITHUB_REPO}.git"


async def _clone_repo(sandbox, path: str = "repo") -> None:
    await sandbox.git.clone(
        url=f"https://github.com/{config.GITHUB_REPO}.git",
        path=path,
        username=config.GITHUB_USER,
        password=config.GITHUB_TOKEN,
    )


async def _write_files(sandbox, files: list[FileEdit], root: str = "repo") -> None:
    uploads = [FileUpload(source=f.content.encode(), destination=f"{root}/{f.path}") for f in files]
    await sandbox.fs.upload_files(uploads)


async def evaluate(files: list[FileEdit], emit_step=None) -> EvalOut:
    """Spin an ephemeral sandbox, apply files, build + render-check. Always cleaned up.

    emit_step(phase, detail) is an optional async callback for live progress logs.
    """
    async def step(phase: str, detail: str = ""):
        if emit_step:
            await emit_step(phase, detail)

    out = EvalOut()
    daytona = _daytona()
    sandbox = None
    try:
        async with daytona:
            await step("sandbox", "warm sandbox (deps pre-baked)")
            sandbox = await _create(daytona, keep=False)
            await step("sync", "syncing repo to latest main")
            await _sync_repo(sandbox)
            await _write_files(sandbox, files)

            app_dir = f"repo/{config.APP_SUBDIR}"

            # node_modules is baked into the image — no npm install per candidate.

            # --- compile? ---
            await step("build", "tsc + vite build")
            t0 = time.perf_counter()
            build = await sandbox.process.exec(config.BUILD_CMD, cwd=app_dir, timeout=300)
            out.build_ms = int((time.perf_counter() - t0) * 1000)
            out.build_log = (build.result or "")[-4000:]
            out.compiled = build.exit_code == 0
            if not out.compiled:
                await step("build_failed", f"did not compile ({out.build_ms}ms)")
                return out
            await step("compiled", f"compiled in {out.build_ms}ms")

            # --- render? --- start dev server, poll the public preview URL for 200
            await step("serve", "starting dev server")
            t1 = time.perf_counter()
            await sandbox.process.create_session("dev")
            await sandbox.process.execute_session_command(
                "dev",
                SessionExecuteRequest(command=f"cd {app_dir} && {config.DEV_CMD}", run_async=True),
            )
            preview = await sandbox.get_preview_link(config.DEV_PORT)
            out.preview_url = preview.url
            headers = {"x-daytona-preview-token": preview.token} if preview.token else {}
            await step("render", "probing preview URL")
            out.rendered = await _probe(preview.url, headers)
            out.render_ms = int((time.perf_counter() - t1) * 1000)
            await step("rendered" if out.rendered else "render_failed",
                       f"{'rendered' if out.rendered else 'no render'} ({out.render_ms}ms)")

            # --- chat survives? every anchor must still be present in the app source ---
            await step("chat_check", "verifying the chat survived")
            out.chat_ok = await _anchors_present(sandbox, f"repo/{config.APP_SUBDIR}/src")
            await step("chat_ok" if out.chat_ok else "chat_broken",
                       "chat survived" if out.chat_ok else "chat was removed/broken")
            return out
    except Exception as e:  # noqa: BLE001
        out.error = f"{type(e).__name__}: {e}"
        return out
    finally:
        if sandbox is not None:
            try:
                await sandbox.delete()   # ephemeral, but delete explicitly to free the pool
            except Exception:  # noqa: BLE001
                pass


async def _anchors_present(sandbox, src_dir: str) -> bool:
    """The chat-survival check: each anchor string must still exist in the app source."""
    for a in anchors():
        r = await sandbox.process.exec(f"grep -rqF -- {shlex.quote(a)} {src_dir}", timeout=30)
        if r.exit_code != 0:
            return False
    return True


async def _probe(url: str, headers: dict, tries: int = 15, delay: float = 1.0) -> bool:
    """Dev server needs a few seconds to boot; poll until 200 with real HTML."""
    async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as http:
        for _ in range(tries):
            try:
                r = await http.get(url, headers=headers)
                if r.status_code == 200 and "<" in r.text[:200]:
                    return True
            except httpx.HTTPError:
                pass
            await asyncio.sleep(delay)
    return False


async def ship(files: list[FileEdit], message: str) -> str | None:
    """Apply the winning files to the repo and push to GitHub. Returns commit sha."""
    daytona = _daytona()
    sandbox = None
    try:
        async with daytona:
            sandbox = await _create(daytona, keep=False)
            await _sync_repo(sandbox)
            await _write_files(sandbox, files)
            await sandbox.git.add("repo", ["."])
            resp = await sandbox.git.commit(
                path="repo", message=message, author=config.GITHUB_USER,
                email=f"{config.GITHUB_USER}@users.noreply.github.com",
            )
            await sandbox.git.push(path="repo", username=config.GITHUB_USER, password=config.GITHUB_TOKEN)
            # commit() response field name differs across SDKs; try common attrs
            return getattr(resp, "sha", None) or getattr(resp, "hash", None)
    except Exception:  # noqa: BLE001
        return None
    finally:
        if sandbox is not None:
            try:
                await sandbox.delete()
            except Exception:  # noqa: BLE001
                pass
