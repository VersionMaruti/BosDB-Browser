# BosDB-Browser - Fly.io Deployment Guide

## 🚀 Why Fly.io?

**Perfect for BosDB-Browser:**
- ✅ **Native Docker support** - Use existing Dockerfile
- ✅ **Free tier: 3 VMs** with 256MB RAM each
- ✅ **Always on** - No sleep/downtime
- ✅ **Fast global deployment**
- ✅ **Persistent volumes** for data storage
- ✅ **Better than Render** for Docker apps

---

## 📋 Quick Deployment Steps

### Step 1: Install Fly.io CLI

**Already installed!** ✅

To verify:
```powershell
flyctl version
```

### Step 2: Authenticate

```bash
flyctl auth login
```

This opens your browser to log in with:
- GitHub
- Google
- Email

### Step 3: Launch Your App

From your project root:

```bash
flyctl launch
```

**Follow the prompts:**
- **App name:** `bosdb-browser` (or your choice)
- **Region:** Choose closest to you (e.g., `sin` for Singapore, `bom` for Mumbai)
- **Would you like to set up a PostgreSQL database?** → **No** (we handle databases in Docker)
- **Would you like to deploy now?** → **Yes**

### Step 4: Set Environment Variables

```bash
# Generate secure encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Set environment variable
flyctl secrets set ENCRYPTION_MASTER_KEY="your-generated-key-here"
flyctl secrets set NODE_ENV=production
```

### Step 5: Deploy!

```bash
flyctl deploy
```

That's it! Your app will be live at: `https://bosdb-browser.fly.dev`

---

## 🔧 Configuration File (fly.toml)

Fly.io creates this automatically, but here's what it should look like:

```toml
app = "bosdb-browser"
primary_region = "sin"  # or your chosen region

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false  # Keep always on
  auto_start_machines = true
  min_machines_running = 1    # Always have 1 running

  [http_service.concurrency]
    type = "requests"
    hard_limit = 250
    soft_limit = 200

  [[http_service.checks]]
    grace_period = "30s"
    interval = "15s"
    method = "get"
    path = "/healthz"
    timeout = "10s"

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

---

## 🗄️ Persistent Storage (Optional)

If you need persistent data:

```bash
# Create a volume
flyctl volumes create bosdb_data --size 1 # 1GB free

# Update fly.toml to mount it
```

Add to `fly.toml`:
```toml
[mounts]
  source = "bosdb_data"
  destination = "/app/apps/web/.bosdb-data"
```

---

## 🔍 Monitoring & Logs

### View Logs

```bash
# Real-time logs
flyctl logs

# Follow logs (like tail -f)
flyctl logs -a bosdb-browser
```

### Check Status

```bash
flyctl status
```

### SSH into VM

```bash
flyctl ssh console
```

---

## 🌐 Custom Domain

### Add Your Domain

```bash
flyctl certs add bosdb.yourdomain.com
```

Then add these DNS records:
```
Type: CNAME
Name: bosdb
Value: bosdb-browser.fly.dev
```

SSL is automatic and free!

---

## 💰 Free Tier Details

**What's included (FREE):**
- ✅ Up to 3 shared-cpu-1x VMs with 256MB RAM
- ✅ 3GB persistent volume storage
- ✅ 160GB outbound data transfer
- ✅ Automatic SSL certificates
- ✅ DDoS protection

**Costs only if you exceed free tier**

**For BosDB-Browser:**
- 1 VM (256MB) = FREE ✅
- Small data usage = FREE ✅
- **Total cost: $0/month**

---

## 🔄 Auto-Deploy from GitHub

### Set up GitHub Actions

Create `.github/workflows/fly-deploy.yml`:

```yaml
name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Get your token:
```bash
flyctl tokens create deploy
```

Add to GitHub: Settings → Secrets → `FLY_API_TOKEN`

---

## 🧪 Health Checks

Fly.io checks `/healthz` endpoint (we created this!):

**Test it:**
```bash
curl https://bosdb-browser.fly.dev/healthz
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-12-29T...",
  "service": "BosDB-Browser"
}
```

---

## 🐛 Troubleshooting

### App won't start

**Check logs:**
```bash
flyctl logs
```

**Common issues:**
- Missing environment variables → Set with `flyctl secrets set`
- Port mismatch → Check Dockerfile exposes correct port
- Memory issues → Increase VM size: `flyctl scale memory 512`

### 502 Bad Gateway

**Check:**
1. App is listening on `0.0.0.0:3000` (not localhost)
2. Health check endpoint exists
3. App actually starts (check logs)

### Out of Memory

**Increase memory:**
```bash
flyctl scale memory 512  # 512MB (still in free tier)
```

Or optimize your app to use less memory.

---

## 📊 Useful Commands

| Command | Purpose |
|---------|---------|
| `flyctl launch` | Create and deploy new app |
| `flyctl deploy` | Deploy updates |
| `flyctl logs` | View application logs |
| `flyctl status` | Check app status |
| `flyctl open` | Open app in browser |
| `flyctl ssh console` | SSH into VM |
| `flyctl scale` | Adjust resources |
| `flyctl secrets set KEY=value` | Set env variables |
| `flyctl apps destroy` | Delete app |

---

## 🔐 Security Best Practices

Before deploying:

- [x] Set strong `ENCRYPTION_MASTER_KEY`
- [x] Use `flyctl secrets` for sensitive data (not env vars in fly.toml)
- [x] Enable HTTPS (automatic)
- [x] Keep `.env` files out of git
- [x] Use `.dockerignore` to exclude sensitive files

---

## ⚡ Performance Optimization

### Reduce Build Time

Add `.dockerignore`:
```
node_modules
.next
.git
*.md
.env*
```

### Scale for Production

```bash
# Add more VMs for redundancy
flyctl scale count 2

# Increase memory
flyctl scale memory 512

# Use dedicated CPU (paid)
flyctl scale vm dedicated-cpu-1x
```

---

## 🆚 Fly.io vs Render vs Vercel

| Feature | Fly.io | Render | Vercel |
|---------|--------|--------|--------|
| **Docker** | ✅ Native | ✅ Supported | ❌ No |
| **Always On** | ✅ Yes | ❌ Sleeps | ✅ Yes |
| **Free Tier** | 3 VMs, 256MB | 750hrs/mo | Unlimited |
| **Setup** | Medium | Easy | Easiest |
| **Best For** | Docker apps | Simple apps | Serverless |
| **BosDB Compatibility** | ✅ Perfect | ✅ OK | ❌ Limited |

**Winner for BosDB-Browser:** **Fly.io** ✅

---

## 🎯 Quick Start Checklist

Follow these steps in order:

1. ✅ Install flyctl (already done!)
2. [ ] Run `flyctl auth login`
3. [ ] Run `flyctl launch`
4. [ ] Choose app name & region
5. [ ] Wait for deployment
6. [ ] Set encryption key: `flyctl secrets set ENCRYPTION_MASTER_KEY="..."`
7. [ ] Visit your app: `https://your-app.fly.dev`
8. [ ] Test login and features

**Expected time:** 10-15 minutes total

---

## 🆘 Getting Help

- **Fly.io Docs:** https://fly.io/docs
- **Community:** https://community.fly.io
- **Status:** https://status.flyio.net
- **Twitter:** @flydotio

---

## 📝 After Deployment

Once live:

1. **Test all features:**
   - Login/signup
   - Database connections (to external DBs)
   - Query execution
   - Dashboard

2. **Set up monitoring:**
   - Use `flyctl logs` to check for errors
   - Set up external monitoring (UptimeRobot, etc.)

3. **Optimize:**
   - Review logs for performance issues
   - Scale if needed
   - Add persistent volumes for data

---

## 🎉 You're Ready!

Just run:

```bash
flyctl auth login
flyctl launch
```

And your app will be live in minutes!

**Your URL will be:** `https://bosdb-browser.fly.dev` (or your chosen name)

---

**Ready to deploy? Let's go! 🚀**
