# Network Setup — Running NexOps Across Machines

This covers what's needed for the PowerShell agent (and admin browsers) on
other Windows machines to reach a NexOps backend running on a different
machine on the same LAN.

## Architecture (unchanged)

```
Agent (agent.ps1)  --HTTP-->  Backend (Express, :4000)  <--HTTP--  React app (Vite, :5173)
                                     |
                                PostgreSQL (:5432)
```

There is no WebSocket/real-time server anywhere in this app (confirmed —
all "live" UI is polling). Backend, frontend dev server, and the agent
each need their own reachability; there's nothing else to expose.

## 1. Backend

Already listens on `0.0.0.0:4000` (`backend/src/server.ts`), so it's
reachable at `http://<server-LAN-IP>:4000` from other machines as soon as
the firewall allows it (see below) — no code change needed for this part.

## 2. Agent

Edit `agent.config.example.json`, save it as `agent.config.json` (same
folder as `agent.ps1` — gitignored, host-specific):

```json
{
  "serverUrl": "http://192.168.1.36:4000"
}
```

Or pass `-BackendUrl` directly: `agent.ps1 -BackendUrl "http://192.168.1.36:4000"`.
(Precedence: `-BackendUrl` param > `agent.config.json` > `http://localhost:4000`
fallback.) The agent prints a connectivity check (DNS, TCP port, `/health`)
every time it starts — read that output first if it's not connecting.

## 3. Frontend

- Dev server (`npm run dev`) now binds `0.0.0.0` (`vite.config.ts`), so
  `http://<this-machine-LAN-IP>:5173` works from other machines' browsers.
- Point it at a remote backend via `VITE_API_URL` (see `.env.example`) —
  copy to `.env.local` and set `VITE_API_URL=http://<server-LAN-IP>:4000`.
- Docker deployment is unaffected — nginx already proxies `/api` to the
  backend container internally, same-origin, no CORS involved.

## 4. CORS

`CORS_ORIGIN` (comma-separated) and `CORS_ALLOW_LAN` (default `true`,
auto-allows any private-LAN-IP origin) — see `backend/.env.example`.

## 5. Windows Firewall

Run as Administrator **on the machine running the backend**:

```powershell
New-NetFirewallRule -DisplayName "NexOps Backend" `
    -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow
```

If you're also serving the frontend dev server to other machines from this
same box:

```powershell
New-NetFirewallRule -DisplayName "NexOps Frontend Dev Server" `
    -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
```

No WebSocket port rule is needed — there is no WebSocket server in this
app today.

To remove these rules later:

```powershell
Remove-NetFirewallRule -DisplayName "NexOps Backend"
Remove-NetFirewallRule -DisplayName "NexOps Frontend Dev Server"
```

## 6. Diagnostics

Run `Test-NexOpsConnection.ps1` from **any machine** to check reachability
to the backend before troubleshooting further:

```powershell
.\Test-NexOpsConnection.ps1 -BackendUrl "http://192.168.1.36:4000"
```

It checks, in order: ping, DNS resolution, TCP port reachability, the
`/health` endpoint, and a couple of real API endpoints — and prints a
specific reason (DNS failure / connection refused / timeout / firewall /
backend offline / API error) rather than a generic failure.

## Checklist

- [ ] Backend machine: firewall rule for port 4000 created (see above)
- [ ] Backend reachable: `Test-NexOpsConnection.ps1` passes from the agent's machine
- [ ] `agent.config.json` created on each agent machine with the correct `serverUrl`
- [ ] Agent's own startup output shows `[OK]` for DNS/TCP/health
- [ ] If accessing the dev frontend from another machine: firewall rule for 5173, and `VITE_API_URL` set
- [ ] `GET http://<server-LAN-IP>:4000/health` returns `{"status":"healthy",...}` from a browser on another machine
