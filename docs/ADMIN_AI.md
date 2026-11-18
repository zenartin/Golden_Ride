# Admin AI assistant

A chat window on every admin page (purple button, bottom right). It answers questions about rides, drivers, riders,
earnings, withdrawals and safety alerts. It can only read data; it can never approve, reject, pay or edit anything.

## Switching it on
Run on your computer, then deploy:

```bash
bash set_ai_key.sh        # choose a service, paste the key at the hidden prompt
bash deploy_backend.sh
```

The key is saved on the server in `/opt/golden_ride/ai.env` (mode 600), never in the project or in git.

| Service | Cost | Get a key |
| --- | --- | --- |
| Google Gemini | free tier | https://aistudio.google.com/apikey |
| Groq | free tier (small limits) | https://console.groq.com/keys |
| OpenRouter | free models (small daily limit) | https://openrouter.ai/keys |
| Anthropic Claude | paid | https://console.anthropic.com/settings/keys |

Settings (all optional except the key), set as lines in `ai.env`:

- `AI_PROVIDER` = `gemini`, `groq`, `openrouter` or `custom` (custom also needs `AI_BASE_URL` and `AI_MODEL`)
- `AI_API_KEY` = the key for those services; `ANTHROPIC_API_KEY` = the Anthropic key (wins if both are set)
- `AI_MODEL` = override the default model (model names change often)
- `AI_REDACT_PII` = `true` (default) hides emails and phone numbers before data goes to a non-Anthropic service
- `ADMIN_AI_MODEL` = model for Anthropic (default `claude-opus-5-5`)

Free plans have small limits and some may use your prompts to improve their products. Names, IDs and amounts are still
sent to the AI service; emails and phone numbers are masked.
