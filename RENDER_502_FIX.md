# 502 Error Fix - Troubleshooting Guide

## 🐛 Problem

After deploying to Render:
- ✅ Build succeeded
- ✅ App showed "Ready in 990ms"
- ❌ Getting **HTTP 502 Bad Gateway** at https://bosdb.onrender.com

## 🔍 Root Cause

The Dockerfile had **two issues**:

### Issue 1: Incorrect Server Path

**Before (Broken):**
```dockerfile
CMD ["node", "apps/web/server.js"]
```

**Problem:** Next.js standalone build puts `server.js` in the root of the standalone directory, not in `apps/web/`.

**After (Fixed):**
```dockerfile
CMD ["node", "server.js"]
```

### Issue 2: Host Binding

**Missing environment variable:**

Next.js needs to bind to `0.0.0.0` (all network interfaces) instead of `localhost` for Render's proxy to work.

**Added:**
```dockerfile
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
```

## ✅ Fix Applied

Updated [`Dockerfile`](file:///C:/Users/Arush%20Gupta/Downloads/BosDB-Browser/Dockerfile):

```diff
 FROM node:20-alpine AS runner
 
 WORKDIR /app
 
 ENV NODE_ENV=production
+ENV HOSTNAME="0.0.0.0"
+ENV PORT=3000
 
 # Copy built application
 COPY --from=builder /app/apps/web/.next/standalone ./
 COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
 COPY --from=builder /app/apps/web/public ./apps/web/public
 
 # Create data directory
 RUN mkdir -p /app/apps/web/.bosdb-data
 
 EXPOSE 3000
 
-CMD ["node", "apps/web/server.js"]
+CMD ["node", "server.js"]
```

## 📤 Changes Pushed

```bash
git commit -m "Fix Dockerfile server.js path and add HOSTNAME env for Render"
git push origin main
```

**Commit:** `3b1f5b7`

## ⏳ What Happens Next

1. **Render Detects Push** (30 seconds)
   - GitHub webhook notifies Render
   - New deployment triggered automatically

2. **Build Process** (5-10 minutes)
   - Pulls latest code with fix
   - Rebuilds Docker image
   - Uses correct server path now

3. **Deployment** (1-2 minutes)
   - Replaces old container
   - Zero-downtime deployment
   - App should be accessible

## 🧪 Verification Steps

After Render finishes redeploying (watch the dashboard):

### 1. Check Deployment Status

- Go to Render Dashboard
- Your service → Logs
- Look for:
  ```
  ✓ Ready in XXXms
  ==> Your service is live 🎉
  ```

### 2. Access the App

Visit: **https://bosdb.onrender.com**

Should now show:
- ✅ BosDB-Browser login page
- ✅ No 502 error
- ✅ Page loads correctly

### 3. Test Basic Functionality

- [ ] Login page displays properly
- [ ] Can create account / login
- [ ] Dashboard loads
- [ ] No console errors

## 📊 Monitoring the Redeploy

You can watch progress in:

1. **Render Dashboard**
   - Go to: https://dashboard.render.com
   - Click your service: `bosdb-browser`
   - View "Events" tab for deployment progress

2. **Build Logs**
   - Click "Logs" tab
   - Select "Build Logs" dropdown
   - Watch Docker build process

3. **Runtime Logs**
   - After build completes
   - Switch to "Runtime Logs"
   - Look for startup messages

## ⏱️ Expected Timeline

| Phase | Time | Status |
|-------|------|--------|
| GitHub → Render webhook | 30s | Automatic |
| Docker image build | 5-10 min | In progress |
| Container deployment | 1-2 min | Pending |
| **Total** | **~10-15 min** | |

## 🆘 If Still Getting 502

If the error persists after redeploy:

### Check 1: Verify Environment Variables

In Render Dashboard → Settings → Environment:
- `NODE_ENV=production`
- `ENCRYPTION_MASTER_KEY=[your key]`
- `PORT=3000`

### Check 2: Review Runtime Logs

Look for errors like:
```
Error: Cannot find module 'server.js'
Error: EADDRINUSE (port already in use)
Error: Missing environment variable
```

### Check 3: Health Check Path

Render Settings → Health Check Path:
- Set to `/` or `/api/health`
- Make sure your app responds to this path

## 📝 Understanding the Fix

### Why `server.js` instead of `apps/web/server.js`?

Next.js standalone build structure:
```
.next/standalone/
├── server.js          ← Entry point (use this!)
├── apps/
│   └── web/
│       ├── .next/
│       └── public/
├── package.json
└── node_modules/
```

The standalone output **flattens** the structure and puts `server.js` at the root.

### Why `HOSTNAME="0.0.0.0"`?

Docker networking:
- `localhost` = only accessible within container
- `0.0.0.0` = accessible from all network interfaces
- Render's proxy needs to connect from outside

Without this, Render's load balancer can't reach your app!

## ✨ Summary

**What was broken:**
- Incorrect server.js path
- Not binding to all network interfaces

**What was fixed:**
- Updated CMD to `["node", "server.js"]`
- Added `HOSTNAME="0.0.0.0"` environment variable
- Added explicit `PORT=3000` for clarity

**Next steps:**
- Wait 10-15 minutes for redeploy
- Visit https://bosdb.onrender.com
- Should work now! 🎉

---

**Last Updated:** 2025-12-29 20:19 IST  
**Status:** Fix deployed, awaiting Render rebuild
