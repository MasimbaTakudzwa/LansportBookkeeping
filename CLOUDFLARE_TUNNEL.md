# Exposing Lansport Analytics via Cloudflare Tunnel

This guide shows how to securely share Lansport Analytics over the internet using a
**free Cloudflare Tunnel** — no inbound firewall rules, no static IP, no port forwarding
required. The tunnel acts as an encrypted outbound connection from your machine to
Cloudflare's edge, which then serves requests to a public hostname you control.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Cloudflare account (free) | [dash.cloudflare.com](https://dash.cloudflare.com) |
| Domain on Cloudflare DNS | Any domain you own — a cheap `.com` works fine |
| Docker Compose running | `START_LANSPORT.bat` or `./start.sh` must be up |
| `cloudflared` CLI | Install instructions below |

---

## Step 1 — Install `cloudflared`

### Windows
Download the installer from the [Cloudflare releases page](https://github.com/cloudflare/cloudflared/releases/latest)
and run `cloudflared-windows-amd64.msi`.

Or with winget:
```
winget install --id Cloudflare.cloudflared
```

### Linux / WSL
```bash
# Debian / Ubuntu
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Or via the Cloudflare package repo (stays up to date)
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg > /dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install cloudflared
```

---

## Step 2 — Authenticate `cloudflared`

```bash
cloudflared tunnel login
```

A browser window opens. Log in to Cloudflare and select the domain you want to use.
This saves a certificate to `~/.cloudflared/cert.pem`.

---

## Step 3 — Create a named tunnel

```bash
cloudflared tunnel create lansport
```

This creates a tunnel with a unique ID (UUID) and saves credentials to
`~/.cloudflared/<UUID>.json`. Note the UUID — you'll need it in the next step.

---

## Step 4 — Create the tunnel config file

Create `~/.cloudflared/config.yml` (or `C:\Users\<you>\.cloudflared\config.yml` on Windows):

```yaml
tunnel: lansport
credentials-file: /home/<you>/.cloudflared/<UUID>.json   # adjust path

ingress:
  - hostname: analytics.yourdomain.com   # change to your subdomain
    service: http://localhost:80         # Nginx port (APP_PORT in .env)
  - service: http_status:404
```

> **Tip:** Use a subdomain like `analytics.yourdomain.com` rather than the apex domain.
> You can use any subdomain you like.

---

## Step 5 — Add the DNS record

```bash
cloudflared tunnel route dns lansport analytics.yourdomain.com
```

This creates a `CNAME` in your Cloudflare DNS pointing `analytics.yourdomain.com` →
`<UUID>.cfargotunnel.com`. You can verify it in the Cloudflare dashboard under DNS.

---

## Step 6 — Start the tunnel

```bash
cloudflared tunnel run lansport
```

Leave this terminal open. The tunnel is live once you see:

```
INF Connection established connIndex=0 ...
```

Visit `https://analytics.yourdomain.com` — HTTPS is automatic via Cloudflare.

---

## Step 7 — Enable password protection (recommended)

Since the app is now public, set `APP_PASSWORD` in your `.env` before starting:

```bash
# .env
APP_PASSWORD=choose-a-strong-password-here
```

Then restart the stack:

```
# Windows
STOP_LANSPORT.bat
START_LANSPORT.bat

# Linux / Mac
./stop.sh && ./start.sh
```

Anyone visiting the dashboard will be prompted for the password before seeing any data.

---

## Optional: Run the tunnel as a background service

### Windows (runs at startup)
```
cloudflared service install
```

### Linux (systemd)
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## Optional: Run cloudflared via Docker Compose

Add this service to `docker-compose.yml` if you want the tunnel managed alongside the app:

```yaml
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    restart: unless-stopped
```

Then add `CLOUDFLARE_TUNNEL_TOKEN=...` to `.env`. Get the token from the
Cloudflare Zero Trust dashboard → Networks → Tunnels → your tunnel → Configure → Token.

> This approach uses a **remotely managed tunnel** (token-based) instead of a local
> config file. It's simpler to rotate credentials but requires the Zero Trust dashboard.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `502 Bad Gateway` | Ensure `START_LANSPORT.bat` is running and Nginx is healthy (`docker compose ps`) |
| `ERR_TUNNEL_CONNECTION_FAILED` | Check `cloudflared tunnel run lansport` is active in a terminal |
| Cert error on first login | Run `cloudflared tunnel login` again; old cert may have expired |
| DNS not resolving | DNS propagation can take a few minutes; try flushing local DNS cache |
| Wrong page served | Verify `service: http://localhost:80` matches your `APP_PORT` in `.env` |

---

## Security notes

- The tunnel uses mutual TLS between your machine and Cloudflare's edge — no secrets exposed.
- Always enable `APP_PASSWORD` when sharing the URL externally.
- Restrict access further using Cloudflare Access (Zero Trust → Applications) for
  email-based or SSO login on top of the app's own password.
- The Cloudflare free plan supports unlimited tunnel bandwidth.
