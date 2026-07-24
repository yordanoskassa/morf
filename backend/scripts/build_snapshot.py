"""Build the warm Daytona snapshot: node20 + the repo cloned + npm deps installed.

Run once (and again whenever frontend/package.json changes):
    cd backend && . .venv/bin/activate && python -m scripts.build_snapshot

Then set DAYTONA_MODE=snapshot in backend/.env so every candidate skips npm install.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from daytona import AsyncDaytona, DaytonaConfig, CreateSnapshotParams, Image, Resources
from app import config


async def main() -> None:
    image = (
        Image.base("node:20-bookworm")
        .workdir("/home/daytona")
        .run_commands(
            f"git clone --depth 1 https://github.com/{config.GITHUB_REPO}.git repo",
            f"cd repo/{config.APP_SUBDIR} && npm install --no-audit --no-fund",
        )
    )
    print(f"building snapshot '{config.DAYTONA_SNAPSHOT}' from {config.GITHUB_REPO} …")
    async with AsyncDaytona(DaytonaConfig(api_key=config.DAYTONA_API_KEY)) as d:
        await d.snapshot.create(
            CreateSnapshotParams(
                name=config.DAYTONA_SNAPSHOT,
                image=image,
                resources=Resources(cpu=2, memory=4, disk=10),
            ),
            on_logs=print,
        )
    print("done:", config.DAYTONA_SNAPSHOT)


if __name__ == "__main__":
    asyncio.run(main())
