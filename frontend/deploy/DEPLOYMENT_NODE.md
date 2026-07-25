# استقرار بدون Docker: Node.js + systemd + Nginx

این روش پیشنهادشده برای سرور فعلی است. کد روی خود سرور Ubuntu ساخته می‌شود؛ بنابراین مشکل تفاوت ویندوز و لینوکس یا شبکه Docker Desktop وجود ندارد.

- دامنه: `complyai.avidaweb.com`
- سرور: `185.126.203.173`
- پورت SSH: `22033`
- مسیر پروژه: `/opt/apps/complyai/`
- شاخه انتشار: `develop`

## 1. اتصال به سرور و نصب پیش‌نیازها

به‌جای `<ssh-user>` نام کاربر SSH خود را بنویسید:

```bash
ssh -p 22033 <ssh-user>@185.126.203.173
```

Node.js 22، Git و Nginx را نصب کنید:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get update
sudo apt-get install -y nodejs git nginx
node --version
npm --version
sudo systemctl enable --now nginx
```

## 2. دریافت پروژه از GitHub

اگر مخزن GitHub عمومی است، این دستورات را اجرا کنید:

```bash
sudo mkdir -p /opt/apps/complyai
sudo chown -R $USER:$USER /opt/apps/complyai
git clone --branch develop https://github.com/Rayan1392/complyai.git /opt/apps/complyai
```

اگر مخزن خصوصی است، ابتدا روی سرور یک SSH deploy key برای GitHub تنظیم کنید، سپس URL کلون را به شکل SSH بنویسید:

```bash
git clone --branch develop git@github.com:Rayan1392/complyai.git /opt/apps/complyai
```

## 3. ساخت production روی سرور

```bash
cd /opt/apps/complyai/frontend
npm ci
NITRO_PRESET=node-server npm run build
```

دستور `NITRO_PRESET=node-server` ضروری است؛ بدون آن خروجی فعلی پروژه برای Cloudflare ساخته می‌شود، نه Ubuntu/Node.js.

برای آزمایش موقت:

```bash
NITRO_HOST=127.0.0.1 NITRO_PORT=3000 node .output/server/index.mjs
```

در یک ترمینال دیگر اجرا کنید:

```bash
curl -I http://127.0.0.1:3000/
```

پس از موفقیت، با `Ctrl+C` سرویس موقت را متوقف کنید.

## 4. ساخت سرویس systemd

یک کاربر محدود برای اجرای برنامه بسازید:

```bash
sudo useradd --system --home /opt/apps/complyai --shell /usr/sbin/nologin complyai || true
sudo chown -R complyai:complyai /opt/apps/complyai
```

فایل `/etc/systemd/system/complyai-frontend.service` را بسازید:

```ini
[Unit]
Description=ComplyAI Frontend
After=network.target

[Service]
Type=simple
User=complyai
Group=complyai
WorkingDirectory=/opt/apps/complyai/frontend
Environment=NODE_ENV=production
Environment=NITRO_HOST=127.0.0.1
Environment=NITRO_PORT=3000
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

سرویس را فعال و اجرا کنید:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now complyai-frontend
sudo systemctl status complyai-frontend --no-pager
```

برای دیدن لاگ‌ها:

```bash
sudo journalctl -u complyai-frontend -f
```

## 5. تنظیم Nginx

فایل `/etc/nginx/sites-available/complyai-frontend` را با این محتوا بسازید:

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

فعال‌سازی Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/complyai-frontend /etc/nginx/sites-enabled/complyai-frontend
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 6. فعال‌سازی HTTPS با Cloudflare

رکورد A در Cloudflare باید `complyai.avidaweb.com` را به `185.126.203.173` متصل کند.

برای صدور اولیه گواهی Let’s Encrypt، موقتاً Cloudflare Proxy را خاموش کنید (ابر خاکستری / **DNS only**):

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d complyai.avidaweb.com
```

پس از موفقیت:

1. در Cloudflare بخش **SSL/TLS** را روی **Full (strict)** بگذارید.
2. در صورت تمایل Cloudflare Proxy را دوباره روشن کنید.
3. آدرس `https://complyai.avidaweb.com` را باز کنید.

از حالت **Flexible** استفاده نکنید.

## 7. انتشار نسخه‌های بعدی

برای هر به‌روزرسانی روی سرور:

```bash
cd /opt/app/complyai
git pull --ff-only origin develop

cd frontend
npm ci
NITRO_PRESET=node-server npm run build
sudo chown -R complyai:complyai /opt/app/complyai
sudo systemctl restart complyai-frontend
sudo systemctl status complyai-frontend --no-pager
```

در نهایت بررسی کنید:

```bash
curl -I https://complyai.avidaweb.com/
```

## نکات امنیتی

- پورت 3000 فقط روی `127.0.0.1` در دسترس است؛ فقط Nginx باید به اینترنت وصل باشد.
- برای SSH از کلید استفاده کنید و پس از اطمینان، ورود با رمزعبور را ببندید.
- متغیرهای محرمانه را داخل Git قرار ندهید؛ آن‌ها را در فایل محافظت‌شده systemd یا محیط سرور تعریف کنید.
