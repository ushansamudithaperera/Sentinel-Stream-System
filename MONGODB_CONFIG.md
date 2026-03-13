# MongoDB Configuration Guide

Choose between **Local MongoDB** (development) or **MongoDB Atlas** (production).

---

## Option 1: Local MongoDB Container (Recommended for Development)

**In `.env.docker`:**
```env
# Uncomment these (they should be active):
MONGO_PORT=27017
MONGO_USER=admin
MONGO_PASSWORD=Kx8_pQ2mNvL9jR3wFbT5sG7hD1cE4aX6yJ0kL-MvB9pW2oN5qS

# Comment out this:
# MONGO_URI=mongodb+srv://...
```

**Start Docker:**
```bash
docker-compose --env-file .env.docker up -d
```

**Connection:** `mongodb://admin:password@localhost:27017`

**Pros:**
- ✅ No internet required
- ✅ Fast (local)
- ✅ Free
- ✅ Data isolated to your machine

---

## Option 2: MongoDB Atlas (Production / Remote)

**Get your Atlas URI:**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create cluster or use existing
3. Click "Connect" → "Drivers" → Copy connection string
4. Format: `mongodb+srv://username:password@cluster.mongodb.net/sentinel-stream?retryWrites=true&w=majority`

**In `.env.docker`:**
```env
# Comment out these:
# MONGO_PORT=27017
# MONGO_USER=admin
# MONGO_PASSWORD=...

# Uncomment and replace with your Atlas URI:
MONGO_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/sentinel-stream?retryWrites=true&w=majority
```

**Start Docker:**
```bash
docker-compose --env-file .env.docker up -d
```

**Pros:**
- ✅ Managed backups
- ✅ High availability
- ✅ Scalable
- ✅ Remote access from multiple machines
- ✅ Atlas UI for monitoring

---

## Switching Between Options

### From Local to Atlas:

```bash
# 1. Stop current containers
docker-compose down

# 2. Edit .env.docker
# Comment: MONGO_PORT, MONGO_USER, MONGO_PASSWORD
# Uncomment: MONGO_URI (with Atlas connection string)

# 3. Start with new config
docker-compose --env-file .env.docker up -d
```

### From Atlas to Local:

```bash
# 1. Stop current containers
docker-compose down -v  # -v removes volumes

# 2. Edit .env.docker
# Uncomment: MONGO_PORT, MONGO_USER, MONGO_PASSWORD
# Comment: MONGO_URI

# 3. Start fresh
docker-compose --env-file .env.docker up -d
```

---

## Verify Connection

```bash
# Check backend logs
docker-compose logs backend

# Look for:
# "MongoDB connected" = Success
# "error" or "ECONNREFUSED" = Connection failed
```

---

## Backup/Restore

**Local MongoDB:**
```bash
# Backup
docker exec sentinel-mongodb mongodump -u admin -p password -o /backup

# Restore
docker exec sentinel-mongodb mongorestore -u admin -p password /backup
```

**Atlas:**
- Use Atlas UI → "Backup" tab
- Automated daily backups included in paid tier

---

## Security Notes

⚠️ **Never commit real credentials to Git:**
```bash
# Good:
.env.docker (in .gitignore)

# Bad:
docker-compose.yml with credentials
```

**For production Atlas:**
- Use strong passwords (30+ characters)
- Enable IP whitelist
- Use database user (not admin account)
- Rotate passwords regularly

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **ECONNREFUSED on localhost:27017** | MongoDB container not running. Check `docker-compose ps` |
| **Authentication failed with Atlas** | Check username/password in MONGO_URI, verify IP whitelist |
| **0 modules transformed** during build | Check `.dockerignore` includes correct files |
| **Port 27017 already in use** | Change `MONGO_PORT` in .env.docker or kill process |

---

**Questions?** Check docker-compose logs:
```bash
docker-compose logs mongodb
docker-compose logs backend
```
