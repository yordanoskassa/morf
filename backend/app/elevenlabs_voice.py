"""Mint a short-lived signed URL so the browser voice widget never sees the API key. 🔒 immutable."""
from __future__ import annotations
import httpx
from . import config


async def signed_url() -> dict:
    """GET a 15-min signed wss URL for the configured ElevenLabs agent."""
    if not (config.ELEVENLABS_API_KEY and config.ELEVENLABS_AGENT_ID):
        return {"error": "ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID not configured"}
    url = "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url"
    async with httpx.AsyncClient(timeout=10.0) as http:
        r = await http.get(
            url,
            params={"agent_id": config.ELEVENLABS_AGENT_ID},
            headers={"xi-api-key": config.ELEVENLABS_API_KEY},
        )
        r.raise_for_status()
        return {"signed_url": r.json()["signed_url"]}
