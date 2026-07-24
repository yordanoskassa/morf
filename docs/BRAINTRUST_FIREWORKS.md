# Routing Fireworks models through the Braintrust gateway

Confirmed from Braintrust docs (2026-07). The "AI proxy" is now the **gateway**; the
base_url `https://api.braintrust.dev/v1/proxy` still works.

Our 3 racers (`glm-5p2`, `kimi-k2p7-code`, `qwen3p7-plus`) are newer than Braintrust's
default model catalog, so each must be registered once as a **custom model**.

## One-time setup (Braintrust UI)

1. **Settings → AI providers → Custom providers → New**
   - **Provider name**: `Fireworks`
   - **Endpoint URL**: `https://api.fireworks.ai/inference/v1`
   - **Format**: `openai`
   - **Headers**: `Authorization: Bearer {{api_key}}` — paste your `fw_...` key as the secret
2. **Add model** (repeat for all 3), Model name = the FULL Fireworks id, flavor `chat`:
   - `accounts/fireworks/models/kimi-k2p7-code`
   - `accounts/fireworks/models/glm-5p2`
   - `accounts/fireworks/models/qwen3p7-plus`

## Calling it (already what `backend/app/models.py` does)

```python
from openai import OpenAI
client = OpenAI(
    base_url="https://api.braintrust.dev/v1/proxy",
    api_key=os.environ["BRAINTRUST_API_KEY"],
)
client.chat.completions.create(
    model="accounts/fireworks/models/glm-5p2",   # SAME string as direct Fireworks
    messages=[...],
)
```

**The `model=` string is identical to the direct-Fireworks path.** So switching gateways is
just `MODEL_GATEWAY=braintrust_proxy` in `backend/.env` — no code change. The upside vs.
direct: every call is logged + cached by Braintrust natively, no `wrap_openai` needed.

## Two gateways, same model strings

| `MODEL_GATEWAY` | base_url | api_key | logging |
|---|---|---|---|
| `fireworks_direct` (default) | `https://api.fireworks.ai/inference/v1` | `FIREWORKS_API_KEY` | via `braintrust.wrap_openai()` |
| `braintrust_proxy` | `https://api.braintrust.dev/v1/proxy` | `BRAINTRUST_API_KEY` | native (+ caching); needs the custom-model registration above |

Sources: Braintrust docs — AI proxy, AI providers, Custom providers; Fireworks OpenAI-compatibility.
