# Secret Santa lock server

Without this server, each player's reveal locks on **their own device only**.
With it, the first reveal locks that player for **everyone, everywhere**.

## Deploy on Railway (about 5 minutes)

1. New Project → Deploy from GitHub repo → `jreeher/reeherygood`.
2. Service Settings → **Root Directory**: `secret-santa/server`.
3. Add a **Volume** mounted at `/data` so locks survive restarts.
4. Variables: `RESET_TOKEN` = any secret phrase (for undoing mistakes).
5. Settings → Networking → **Generate Domain**.
6. In `secret-santa/index.html`, set `const LOCK_API = 'https://<your-domain>';` and push.

## Undo a lock (organizer only)

```
curl -X POST https://<your-domain>/reset -H "X-Reset-Token: <token>" -H "Content-Type: application/json" -d '{"name":"Jake"}'
```

Send `{}` instead to unlock everyone.
