# Deploy the frontend with Docker

This guide builds a Linux Docker image on your local machine, copies that image to the Ubuntu server, and runs it behind Nginx.

- Public hostname: `complyai.avidaweb.com`
- Server: `185.126.203.173`
- SSH port: `22033`
- Server deployment directory: `/opt/app/complyai/frontend/`

The frontend uses TanStack Start SSR, so it is a Node.js web server inside the container—not a static website copied to Nginx.

## 1. One-time local setup

Install Docker Desktop and ensure it is running. From `frontend/`, build a Linux image using the included [Dockerfile](Dockerfile):

```powershell
docker build --platform linux/amd64 -f deploy/Dockerfile -t complyai-frontend:20260725-1 .
```

If Docker reports a temporary `ECONNRESET` while downloading npm packages, run the same build command again. The Dockerfile keeps the npm download cache between retries.

### Docker Desktop npm-network troubleshooting

If repeated builds stop at `RUN npm ci` with `ECONNRESET`, the dependency files are not the cause; Docker Desktop's Linux VM cannot keep a connection to the npm registry. Confirm it directly:

```powershell
docker run --rm node:22-bookworm-slim node -e "fetch('https://registry.npmjs.org/').then(r => console.log(r.status)).catch(err => { console.error(err); process.exit(1) })"
```

If this command fails:

1. Restart Docker Desktop.
2. In **Docker Desktop → Settings → Resources → Proxies**, select the system proxy setting, or enter the proxy required by your network. Remove a stale manual proxy if your network does not use one.
3. Check that local security software, VPN, or firewall rules permit Docker Desktop to reach `registry.npmjs.org` over HTTPS (TCP 443).
4. Run the diagnostic command again, then repeat `docker build`.

Do not use `--legacy-peer-deps` or `--force`; the image's lockfile now resolves normally.

Use `linux/amd64` only if the Ubuntu server is x86_64 (verify on the server with `uname -m`; it should report `x86_64`). For an ARM server, use `linux/arm64` instead.

Test the exact image locally:

```powershell
docker run --rm -p 3000:3000 complyai-frontend:20260725-1
```

Open `http://localhost:3000`, check the application, then stop the container with `Ctrl+C`.

## 2. Export and upload the image

Save the tagged image as an archive. `docker save` includes the image layers and tag, so the server does not need to build the application or download application packages.

```powershell
docker save --output deploy/complyai-frontend-20260725-1.tar complyai-frontend:20260725-1
scp -P 22033 deploy/complyai-frontend-20260725-1.tar <ssh-user>@185.126.203.173:/tmp/
```

Replace `<ssh-user>` with your Ubuntu SSH account. Keep the image tag and archive name identical for each release. This uncompressed form works directly in PowerShell; compress it separately only if the transfer time requires it.

## 3. One-time Ubuntu server setup

Connect to the server:

```bash
ssh -p 22033 <ssh-user>@185.126.203.173
```

Install Docker Engine using Docker's official Ubuntu repository. Ubuntu 24.04 is supported.

```bash
sudo apt update
sudo apt install -y ca-certificates curl nginx
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker nginx
sudo docker run --rm hello-world
```

Create the deployment directory:

```bash
sudo install -d -o <ssh-user> -g <ssh-user> /opt/app/complyai/frontend
```

## 4. Load and run a release

On the server, load the uploaded image and run it. The `127.0.0.1` binding means only Nginx can reach the container directly.

```bash
sudo docker load -i /tmp/complyai-frontend-20260725-1.tar

sudo docker rm -f complyai-frontend 2>/dev/null || true
sudo docker run -d \
  --name complyai-frontend \
  --restart unless-stopped \
  --publish 127.0.0.1:3000:3000 \
  complyai-frontend:20260725-1

sudo docker ps
curl -I http://127.0.0.1:3000/
```

View application logs when needed:

```bash
sudo docker logs --tail 100 complyai-frontend
```

## 5. Configure Nginx

Create `/etc/nginx/sites-available/complyai-frontend`:

```nginx
server {
    listen 80;
    server_name complyai.avidaweb.com;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/complyai-frontend /etc/nginx/sites-enabled/complyai-frontend
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 6. Cloudflare and HTTPS

Your Cloudflare record should be:

| Type | Name | Target |
| --- | --- | --- |
| A | `complyai` | `185.126.203.173` |

For the initial Let's Encrypt certificate, temporarily switch the Cloudflare record to **DNS only** (gray cloud). Confirm that ports `80` and `443` are open at the provider/firewall, then run:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d complyai.avidaweb.com
```

After it succeeds:

1. In Cloudflare, set **SSL/TLS → Overview** to **Full (strict)**.
2. Optionally enable the orange-cloud proxy for the `complyai` record again.
3. Verify the site:

   ```bash
   curl -I https://complyai.avidaweb.com/
   ```

Never use Cloudflare **Flexible** SSL mode.

## 7. Release and rollback routine

For every new release:

1. Choose a new tag, for example `20260730-1`.
2. Run the local `docker build`, local test, `docker save`, and `scp` commands from sections 1 and 2.
3. Run `docker load` on the server.
4. Replace the running container with the new image:

   ```bash
   sudo docker rm -f complyai-frontend
   sudo docker run -d --name complyai-frontend --restart unless-stopped --publish 127.0.0.1:3000:3000 complyai-frontend:20260730-1
   ```

5. Check `https://complyai.avidaweb.com` and `sudo docker logs --tail 100 complyai-frontend`.

To roll back, run the same `docker run` command with the previous image tag. Loaded images remain on the server until removed:

```bash
sudo docker image ls complyai-frontend
sudo docker rm -f complyai-frontend
sudo docker run -d --name complyai-frontend --restart unless-stopped --publish 127.0.0.1:3000:3000 complyai-frontend:<previous-tag>
```

## Security notes

- Build with `--platform` matching the server architecture; the container build itself creates the Linux Node output.
- Do not add credentials to the Docker image. Pass server-only secrets with `--env-file` from a root-owned file if they are introduced later.
- Keep port `3000` bound to `127.0.0.1`; expose only Nginx publicly.
- Use SSH keys and keep Docker, Nginx, and Ubuntu patched.
