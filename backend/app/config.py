"""Central config + the 3-model panel. 🔒 immutable."""
import os
from pathlib import Path
from dataclasses import dataclass

# load backend/.env before any os.getenv below (config is imported first everywhere)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    pass


@dataclass(frozen=True)
class Racer:
    """One competing model in the morph race."""
    key: str            # short label used in the scoreboard
    model: str          # exact Fireworks model id
    role: str           # human description of its strength


# The 3 racers. Exact ids pulled from the Fireworks docs (2026-07).
RACERS: list[Racer] = [
    Racer("kimi",  "accounts/fireworks/models/kimi-k2p7-code", "code specialist / frontend"),
    Racer("glm",   "accounts/fireworks/models/glm-5p2",        "opus-level reasoning"),
    Racer("qwen",  "accounts/fireworks/models/qwen3p7-plus",   "fast + cheap workhorse"),
]

# --- gateways -----------------------------------------------------------------
# "fireworks_direct" : OpenAI client -> Fireworks, wrapped with braintrust.wrap_openai
#                      (guaranteed logging, verified from docs). DEFAULT.
# "braintrust_proxy" : OpenAI client -> Braintrust gateway (base_url below). Logs +
#                      caches natively. Requires registering each racer as a CUSTOM
#                      MODEL in Braintrust settings (they're newer than the default
#                      catalog) — see docs/BRAINTRUST_FIREWORKS.md. The model= string
#                      stays identical to the direct path, so no code change to switch.
MODEL_GATEWAY = os.getenv("MODEL_GATEWAY", "fireworks_direct")

FIREWORKS_BASE_URL = "https://api.fireworks.ai/inference/v1"
BRAINTRUST_PROXY_URL = "https://api.braintrust.dev/v1/proxy"

FIREWORKS_API_KEY = os.getenv("FIREWORKS_API_KEY", "")
BRAINTRUST_API_KEY = os.getenv("BRAINTRUST_API_KEY", "")
BRAINTRUST_PROJECT = os.getenv("BRAINTRUST_PROJECT", "morph")
BRAINTRUST_PROJECT_ID = os.getenv("BRAINTRUST_PROJECT_ID", "")  # needed for BTQL scoreboard

DAYTONA_API_KEY = os.getenv("DAYTONA_API_KEY", "")
# Sandbox base. mode "image" = create from a public Docker image each time (no setup,
# node+npm+git included). mode "snapshot" = use a prebuilt warm snapshot (faster; make
# once with node20 + deps baked in). Default image so it runs with zero pre-setup.
DAYTONA_MODE = os.getenv("DAYTONA_MODE", "image")
DAYTONA_IMAGE = os.getenv("DAYTONA_IMAGE", "node:20-bookworm")
DAYTONA_SNAPSHOT = os.getenv("DAYTONA_SNAPSHOT", "morph-node20")
# Deps are baked into a cached image (built once, reused 24h) so candidates never run
# npm install. Bump this whenever frontend/package.json changes to rebuild the image.
DEPS_VERSION = os.getenv("DEPS_VERSION", "1")

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_AGENT_ID = os.getenv("ELEVENLABS_AGENT_ID", "")

# MongoDB — the consistent operational store: every morph is persisted here, and the
# scoreboard + conversation memory + undo all read from it (single source of truth).
MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB = os.getenv("MONGODB_DB", "morph")

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO = os.getenv("GITHUB_REPO", "")          # "owner/repo"
GITHUB_USER = os.getenv("GITHUB_USER", "morph-bot")

# How the app under edit is built / served inside the sandbox.
INSTALL_CMD = os.getenv("INSTALL_CMD", "npm install --no-audit --no-fund")
BUILD_CMD = os.getenv("BUILD_CMD", "npm run build")
DEV_CMD = os.getenv("DEV_CMD", "npm run dev -- --host 0.0.0.0 --port 3000")
DEV_PORT = int(os.getenv("DEV_PORT", "3000"))
APP_SUBDIR = os.getenv("APP_SUBDIR", "frontend")    # where package.json lives in the repo

# Seconds a user has to hit undo before a morph is considered "kept".
UNDO_WINDOW_S = int(os.getenv("UNDO_WINDOW_S", "15"))
