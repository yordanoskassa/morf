"""Central config + the 3-model panel. 🔒 immutable."""
import os
from dataclasses import dataclass


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
# "braintrust_proxy" : OpenAI client -> Braintrust proxy (base_url below). Logs +
#                      caches natively. Requires the Fireworks key configured as a
#                      secret in your Braintrust org settings.
MODEL_GATEWAY = os.getenv("MODEL_GATEWAY", "fireworks_direct")

FIREWORKS_BASE_URL = "https://api.fireworks.ai/inference/v1"
BRAINTRUST_PROXY_URL = "https://api.braintrust.dev/v1/proxy"

FIREWORKS_API_KEY = os.getenv("FIREWORKS_API_KEY", "")
BRAINTRUST_API_KEY = os.getenv("BRAINTRUST_API_KEY", "")
BRAINTRUST_PROJECT = os.getenv("BRAINTRUST_PROJECT", "morph")
BRAINTRUST_PROJECT_ID = os.getenv("BRAINTRUST_PROJECT_ID", "")  # needed for BTQL scoreboard

DAYTONA_API_KEY = os.getenv("DAYTONA_API_KEY", "")
# Prebuilt snapshot with node20 + the repo's npm deps already installed. Make once,
# reuse for every morph so sandboxes start warm. See docs/ARCHITECTURE.md.
DAYTONA_SNAPSHOT = os.getenv("DAYTONA_SNAPSHOT", "morph-node20")

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_AGENT_ID = os.getenv("ELEVENLABS_AGENT_ID", "")

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO = os.getenv("GITHUB_REPO", "")          # "owner/repo"
GITHUB_USER = os.getenv("GITHUB_USER", "morph-bot")

# How the app under edit is built / served inside the sandbox.
BUILD_CMD = os.getenv("BUILD_CMD", "npm run build")
DEV_CMD = os.getenv("DEV_CMD", "npm run dev -- --host 0.0.0.0 --port 3000")
DEV_PORT = int(os.getenv("DEV_PORT", "3000"))
APP_SUBDIR = os.getenv("APP_SUBDIR", "frontend")    # where package.json lives in the repo

# Seconds a user has to hit undo before a morph is considered "kept".
UNDO_WINDOW_S = int(os.getenv("UNDO_WINDOW_S", "15"))
