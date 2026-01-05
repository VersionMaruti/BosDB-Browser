# Railway Database Connections - Setup Guide

## आपके Railway Database Credentials

### 1. MongoDB
```
Internal: mongodb://mongo:qvlWNvRXbwxCKdUWGhiSJAmOeuBDIgsN@mongodb.railway.internal:27017
Public: mongodb://mongo:qvlWNvRXbwxCKdUWGhiSJAmOeuBDIgsN@[PUBLIC_HOST]:[PORT]
```

### 2. Redis
```
URL: redis://default:TQiXFYCXDhchORciVjuadzoXwCbdQNTH@trolley.proxy.rlwy.net:17906
Host: trolley.proxy.rlwy.net
Port: 17906
Password: TQiXFYCXDhchORciVjuadzoXwCbdQNTH
```

### 3. PostgreSQL
```
URL: postgresql://postgres:jJjtOCdFTQrUgyCTHdyVUhbiaykdWtHj@crossover.proxy.rlwy.net:18633/railway
Host: crossover.proxy.rlwy.net
Port: 18633
Database: railway
Username: postgres
Password: jJjtOCdFTQrUgyCTHdyVUhbiaykdWtHj
```

### 4. MySQL
```
URL: mysql://root:kykTPngyyBaowLwpsIPVmsBjTJrnzCpq@maglev.proxy.rlwy.net:51411/railway
Host: maglev.proxy.rlwy.net
Port: 51411
Database: railway
Username: root
Password: kykTPngyyBaowLwpsIPVmsBjTJrnzCpq
```

---

## Setup Steps

### Step 1: Update MongoDB Connection

Railway का MongoDB internal URL है, इसलिए आपको public URL चाहिए होगा:

1. **Railway Dashboard पर जाएं**: https://railway.app/dashboard
2. **MongoDB service** पर क्लिक करें
3. **Connect** tab में जाएं
4. **Public Networking** enable करें (अगर नहीं है)
5. Public URL copy करें (format: `mongodb.railway.app` जैसा होगा)

फिर `.env` में update करें:
```bash
# Apps/web/.env
MONGODB_URI=mongodb://mongo:qvlWNvRXbwxCKdUWGhiSJAmOeuBDIgsN@[PUBLIC_HOST]:[PORT]/[DATABASE]
```

### Step 2: BosDB में Databases Add करें

#### Option A: Dashboard से Add करें (आसान)

1. **BosDB खोलें**: http://localhost:3001
2. **Login करें**: admin / Admin@123
3. **Dashboard** पर जाएं
4. **"Add Connection"** button क्लिक करें

फिर हर database के लिए ये details भरें:

---

#### PostgreSQL Connection

```
Name: Railway PostgreSQL
Type: PostgreSQL
Host: crossover.proxy.rlwy.net
Port: 18633
Database: railway
Username: postgres
Password: jJjtOCdFTQrUgyCTHdyVUhbiaykdWtHj
SSL: ✅ Yes
Read Only: ❌ No
```

---

#### MySQL Connection

```
Name: Railway MySQL  
Type: MySQL
Host: maglev.proxy.rlwy.net
Port: 51411
Database: railway
Username: root
Password: kykTPngyyBaowLwpsIPVmsBjTJrnzCpq
SSL: ✅ Yes
Read Only: ❌ No
```

---

#### Redis Connection

```
Name: Railway Redis
Type: Redis
Host: trolley.proxy.rlwy.net
Port: 17906
Password: TQiXFYCXDhchORciVjuadzoXwCbdQNTH
Database: 0 (default)
```

---

### Step 3: Test Connections

हर connection को "Test Connection" button से test करें। अगर successful है तो ✅ दिखेगा।

---

## Troubleshooting

### Issue 1: "Connection Timeout"

**Solution**: Railway में public networking enable करें:
1. Railway Dashboard → Service → Settings
2. **Networking** section में जाएं
3. **Generate Domain** या **Public Networking** enable करें

### Issue 2: "SSL Error"

**Solution**: 
- SSL checkbox को enable/disable करके try करें
- कुछ Railway services SSL require करती हैं, कुछ नहीं

### Issue 3: MongoDB "mongodb.railway.internal not found"

**Solution**: 
- `.railway.internal` सिर्फ Railway के अंदर काम करता है
- Local development के लिए public URL use करें
- Public URL Railway dashboard से मिलेगा

---

## MongoDB Public URL कैसे निकालें

### Method 1: Railway Dashboard

1. Railway Dashboard खोलें
2. MongoDB service पर क्लिक करें
3. **Variables** tab → **Public Networking** खोजें
4. या **Connect** tab में public URL मिलेगा

### Method 2: Railway CLI

```bash
railway variables
# MONGO_URL variable देखें
```

### Method 3: Connection String Format

Railway usually provides:
```
mongodb://mongo:PASSWORD@containers-us-west-XXX.railway.app:PORT
```

Replace:
- `PASSWORD`: qvlWNvRXbwxCKdUWGhiSJAmOeuBDIgsN
- `PORT`: Railway से मिलेगा

---

## Docker को Disable करना (Optional)

अगर आप Docker provisioning feature को पूरी तरह disable करना चाहते हैं:

### Option 1: Environment Variable
```bash
# .env में add करें
DISABLE_DOCKER_PROVISIONING=true
```

### Option 2: UI में Hide करें
Dashboard के "Provision Database" button को hide कर सकते हैं।

---

## Summary

✅ **MongoDB**: Railway से public URL लेकर MONGODB_URI में set करें  
✅ **PostgreSQL**: BosDB dashboard में direct add करें  
✅ **MySQL**: BosDB dashboard में direct add करें  
✅ **Redis**: BosDB dashboard में direct add करें  

**सभी databases बिना Docker के directly connect हो जाएंगे!**

---

## Next Steps

1. ✅ Railway dashboard से MongoDB का public URL निकालें
2. ✅ `.env` या `apps/web/.env` में MONGODB_URI update करें
3. ✅ Dev server restart करें: `npm run dev`
4. ✅ BosDB dashboard में login करें
5. ✅ चारों databases add करें
6. ✅ हर connection को test करें

**Done! अब आप Railway databases को directly use कर सकते हैं!** 🚀
