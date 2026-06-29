# HireFlow AI — Alibaba Cloud ECS Deployment Guide

Deploy HireFlow AI on **Alibaba Cloud Elastic Compute Service (ECS)** using Docker.
This satisfies the hackathon requirement: **backend deployed on Alibaba Cloud** with proof in this repo (`deploy/` folder).

**Estimated time:** 60–90 minutes  
**Cost:** Uses your **$40 hackathon credits** — pick **free/low-cost** options at every step.

---

## What you will deploy

| Component | Where it runs | Port |
|-----------|---------------|------|
| FastAPI backend | ECS Docker container | 8000 |
| React dashboard | ECS Docker container (nginx) | 80 |
| Resume PDFs | Alibaba OSS (or local Docker volume) | — |
| Database | MongoDB Atlas (free tier, external) | — |
| Vector DB | Qdrant Cloud (free tier, external) | — |
| AI | Qwen Cloud API | — |

---

## Prerequisites checklist

Before starting, have these ready:

- [ ] Alibaba Cloud account with hackathon credits activated
- [ ] `backend/.env` filled in (copy from `backend/.env.example`)
- [ ] `credentials/google-service-account.json` (Google Calendar Service Account)
- [ ] GitHub repo pushed (public, MIT license)
- [ ] Docker installed on your ECS instance (guide below installs it)

---

## PART 1 — Create an Alibaba Cloud ECS instance

### Step 1.1 — Open Alibaba Cloud Console

1. Open your browser and go to: **https://www.alibabacloud.com/**
2. Click the blue **Sign In** button (top-right corner).
3. Sign in with the account that has your **hackathon credits**.
4. After login you should see the **Alibaba Cloud Console** home page with product icons (ECS, OSS, RDS, etc.).

**If the page looks different:** Look for **Console** or **My Account** in the top menu — click it to reach the same dashboard.

---

### Step 1.2 — Open ECS

1. In the console search bar at the top, type **ECS**.
2. Click **Elastic Compute Service** in the dropdown.
3. You should see the **ECS Overview** page with a left sidebar: *Instances*, *Images*, *Security Groups*, etc.

---

### Step 1.3 — Create instance

1. In the left sidebar, click **Instances**.
2. Click the orange **Create Instance** button (top-right).
3. You will see the **Custom Launch** / **Quick Launch** wizard.

**Billing (pick FREE/cheapest):**

4. **Region:** Choose **Singapore** or **US (Virginia)** — closest region with good Qwen latency. Avoid regions you don't recognize.
5. **Instance type:** Select **Shared** or **General-purpose** → pick the **smallest** option (e.g. `ecs.t6-c1m1.large` or `ecs.e-c1m1.large`). This keeps cost within $40 credits.
6. **Image:** Click **Public Image** → select **Ubuntu** → **Ubuntu 22.04 64-bit**.
7. **System disk:** **ESSD** or **Cloud Efficient** → **40 GB** (minimum is fine).

**Network:**

8. **Network:** Default VPC is OK — leave as suggested.
9. **Public IP:** Enable **Assign Public IPv4 Address** (required so you can SSH and open the app in a browser).

**Security group (important):**

10. Click **Create Security Group** or edit existing.
11. Add **Inbound rules**:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | 0.0.0.0/0 (or your IP) | SSH |
| 80 | TCP | 0.0.0.0/0 | Frontend dashboard |
| 8000 | TCP | 0.0.0.0/0 | FastAPI backend |

12. **Login credentials:** Choose **Password** → set a strong root/ubuntu password you will remember.
13. **Instance name:** `hireflow-ai-prod`
14. Click **Create Order** / **Create Instance** (orange button at bottom).
15. Confirm you see **Pay with credits** or **$0** if within free tier — then confirm payment.

**What you should see next:** Instance status **Starting** → wait 1–2 minutes until **Running** (green).

16. Copy the **Public IP Address** from the instance list — you need it later (example: `47.xxx.xxx.xxx`).

---

## PART 2 — Connect to ECS via SSH

### Step 2.1 — SSH from Windows (PowerShell)

1. Open **PowerShell** on your PC.
2. Run (replace with your ECS public IP):

```powershell
ssh root@YOUR_ECS_PUBLIC_IP
```

3. Type **yes** if asked about fingerprint.
4. Enter the password you set in Step 1.3.

**You should see:** A Linux prompt like `root@iZxxxxx:~#`

---

## PART 3 — Install Docker on ECS

Run these commands one at a time on the ECS instance:

```bash
apt-get update
apt-get install -y ca-certificates curl gnupg git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

Verify:

```bash
docker --version
docker compose version
```

**Expected output:** Docker version 24+ and Compose v2.x

---

## PART 4 — Clone your GitHub repo on ECS

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/hireflow-ai.git
cd hireflow-ai
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## PART 5 — Configure environment on ECS

### Step 5.1 — Backend .env

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Fill in all values. **Critical fields for production:**

```env
APP_ENV=production
DEBUG=false
MOCK_QWEN=false
QWEN_MODEL=qwen-plus

# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://...

# Qdrant Cloud
QDRANT_URL=https://...
QDRANT_API_KEY=...

# Gmail App Password (no OAuth)
GMAIL_USER=your-app@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Google Calendar Service Account
GOOGLE_SERVICE_ACCOUNT_FILE=/app/credentials/google-service-account.json
GOOGLE_CALENDAR_ID=your_calendar_id@group.calendar.google.com

# Alibaba Cloud OSS (hackathon proof)
OSS_ACCESS_KEY_ID=your_access_key
OSS_ACCESS_KEY_SECRET=your_secret
OSS_ENDPOINT=oss-ap-southeast-1.aliyuncs.com
OSS_BUCKET_NAME=hireflow-ai-resumes
OSS_REGION=ap-southeast-1

# CORS — allow your ECS frontend
CORS_ORIGINS=http://YOUR_ECS_PUBLIC_IP,http://YOUR_ECS_PUBLIC_IP:8000
```

Save: `Ctrl+O`, Enter, `Ctrl+X` in nano.

### Step 5.2 — Google Service Account JSON

Upload your JSON file to ECS:

From your **local PC** (new PowerShell window):

```powershell
scp d:\HireFlow-ai\hireflow-ai\credentials\google-service-account.json root@YOUR_ECS_PUBLIC_IP:/opt/hireflow-ai/credentials/
```

---

## PART 6 — Create Alibaba OSS bucket (resume storage)

### Step 6.1 — Open OSS console

1. Go to **https://oss.console.aliyun.com/** (or search **OSS** in Alibaba Cloud console).
2. You should see **Overview** and **Buckets** in the left menu.

### Step 6.2 — Create bucket

1. Click **Create Bucket** (orange button).
2. **Bucket Name:** `hireflow-ai-resumes` (must match `OSS_BUCKET_NAME` in `.env`).
3. **Region:** Same region as your ECS (e.g. Singapore → `ap-southeast-1`).
4. **Storage Class:** **Standard** (default).
5. **ACL:** **Private** (recommended).
6. **Versioning:** Off (default).
7. Click **OK** / **Create**.

**What you should see:** New bucket listed on the Buckets page.

### Step 6.3 — Create AccessKey for OSS

1. Click your **profile icon** (top-right) → **AccessKey Management**.
2. Click **Create AccessKey** → confirm SMS/email verification.
3. Copy **AccessKey ID** and **AccessKey Secret** into `backend/.env` as `OSS_ACCESS_KEY_ID` and `OSS_ACCESS_KEY_SECRET`.

**Never commit these keys to GitHub.**

---

## PART 7 — Build and run with Docker Compose

### Step 7.1 — Set frontend API URL for your ECS IP

Edit `deploy/docker-compose.yml` build args (on ECS):

```bash
nano deploy/docker-compose.yml
```

Change:

```yaml
args:
  VITE_API_BASE_URL: http://YOUR_ECS_PUBLIC_IP:8000
  VITE_WS_URL: ws://YOUR_ECS_PUBLIC_IP:8000/ws/pipeline
```

### Step 7.2 — Build and start

From repo root on ECS:

```bash
cd /opt/hireflow-ai
docker compose -f deploy/docker-compose.yml up --build -d
```

**First build takes 5–10 minutes.**

Check status:

```bash
docker compose -f deploy/docker-compose.yml ps
docker compose -f deploy/docker-compose.yml logs -f backend
```

Press `Ctrl+C` to exit logs.

### Step 7.3 — Verify deployment

Open in your browser:

| URL | Expected |
|-----|----------|
| `http://YOUR_ECS_PUBLIC_IP:8000/health` | JSON `{"status":"healthy",...}` |
| `http://YOUR_ECS_PUBLIC_IP` | HireFlow AI dashboard |
| `http://YOUR_ECS_PUBLIC_IP:8000/docs` | FastAPI Swagger UI |

**Screenshot these for Devpost** — proof of Alibaba Cloud deployment.

---

## PART 8 — Enable auto-start on reboot

```bash
cd /opt/hireflow-ai
docker compose -f deploy/docker-compose.yml up -d
```

Create a systemd service (optional but recommended):

```bash
cat > /etc/systemd/system/hireflow.service << 'EOF'
[Unit]
Description=HireFlow AI Docker Compose
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/hireflow-ai
ExecStart=/usr/bin/docker compose -f deploy/docker-compose.yml up -d
ExecStop=/usr/bin/docker compose -f deploy/docker-compose.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl enable hireflow.service
systemctl start hireflow.service
```

---

## PART 9 — Update deployment after code changes

On ECS:

```bash
cd /opt/hireflow-ai
git pull origin main
docker compose -f deploy/docker-compose.yml up --build -d
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Cannot SSH | Check security group allows port 22 |
| Dashboard blank | Rebuild frontend with correct `VITE_API_BASE_URL` |
| API CORS error | Add ECS IP to `CORS_ORIGINS` in `.env`, restart backend |
| `health` fails | Run `docker compose logs backend` — usually missing `.env` keys |
| OSS upload fails | Verify bucket region matches `OSS_ENDPOINT` |
| WebSocket disconnected | Open port 8000; set `VITE_WS_URL` to `ws://IP:8000/ws/pipeline` |

---

## Hackathon submission proof checklist

Include in Devpost / README:

- [ ] ECS public IP and screenshot of `/health` response
- [ ] Screenshot of dashboard running on ECS
- [ ] Link to this file: `deploy/alibaba-ecs-setup.md`
- [ ] Link to `deploy/Dockerfile` and `deploy/docker-compose.yml`
- [ ] OSS bucket name visible in `.env.example` and backend code (`app/services/oss_storage.py`)

---

## Local Docker test (before ECS)

On your PC from repo root:

```powershell
cd d:\HireFlow-ai\hireflow-ai
copy backend\.env.example backend\.env
# Edit backend\.env — set MOCK_QWEN=true for local test

docker compose -f deploy/docker-compose.yml up --build
```

Open **http://localhost** and **http://localhost:8000/health**.

---

## Files in this deploy folder

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: React → nginx, Python → FastAPI |
| `docker-compose.yml` | Runs backend + frontend on ECS |
| `nginx.conf` | Serves React + proxies API/WebSocket |
| `alibaba-ecs-setup.md` | This guide |

**MIT License** — HireFlow AI, Global AI Hackathon by Qwen Cloud.
