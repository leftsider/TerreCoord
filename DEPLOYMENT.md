# 🚀 Deployment Guide - TerreCoord Property Coordinator

## Pre-Deployment Checklist

### Security
- [ ] All sensitive data in `.env` file (never committed)
- [ ] `.gitignore` includes: `.env`, `token.json`, `node_modules/`
- [ ] HTTPS/SSL certificate configured
- [ ] Owner dashboard password set (optional but recommended)
- [ ] Rate limiting configured for public routes
- [ ] Input validation and sanitization verified

### Configuration
- [ ] All environment variables documented
- [ ] `calendars.json` configured with actual Calendar IDs
- [ ] Email SMTP credentials tested
- [ ] Google OAuth redirect URI updated for production domain
- [ ] Feature flags set appropriately for production

### Testing
- [ ] All core features tested locally
- [ ] Email notifications verified working
- [ ] PDF generation tested
- [ ] Conflict detection validated
- [ ] Mobile responsive design checked
- [ ] Browser compatibility verified (Chrome, Firefox, Safari, Edge)

## Platform-Specific Deployment

### Option 1: Heroku (Recommended for beginners)

#### Step 1: Prepare App

```bash
# Add Procfile
echo "web: node app.js" > Procfile

# Add .gitignore if not exists
cat << EOF > .gitignore
node_modules/
.env
token.json
*.log
EOF
```

#### Step 2: Create Heroku App

```bash
# Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
heroku login
heroku create TerreCoord-coordinator

# Or use custom domain
heroku create TerreCoord-coordinator --region us
```

#### Step 3: Configure Environment Variables

```bash
heroku config:set NODE_ENV=production
heroku config:set PORT=3000
heroku config:set GOOGLE_CLIENT_ID=your_client_id
heroku config:set GOOGLE_CLIENT_SECRET=your_client_secret
heroku config:set GOOGLE_REDIRECT_URI=https://TerreCoord-coordinator.herokuapp.com/oauth2callback
heroku config:set EMAIL_SERVICE=gmail
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASSWORD=your_app_password
heroku config:set EMAIL_FROM_NAME="TerreCoord Property Coordinator"
heroku config:set APP_NAME=TerreCoord
heroku config:set APP_URL=https://TerreCoord-coordinator.herokuapp.com
heroku config:set OWNER_EMAIL=owner@example.com
heroku config:set ENABLE_EMAIL_NOTIFICATIONS=true
heroku config:set ENABLE_PDF_GENERATION=true
heroku config:set ENABLE_CUSTOMS_DOCS=true
```

#### Step 4: Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client
4. Add Authorized redirect URI: `https://TerreCoord-coordinator.herokuapp.com/oauth2callback`
5. Save changes

#### Step 5: Deploy

```bash
git add .
git commit -m "Production deployment"
git push heroku main

# View logs
heroku logs --tail

# Open app
heroku open
```

#### Step 6: Authenticate

Visit: `https://TerreCoord-coordinator.herokuapp.com/auth/google`

---

### Option 2: Railway.app (Modern alternative)

#### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

#### Step 2: Initialize Project

```bash
railway init
railway link
```

#### Step 3: Configure Variables

Use Railway dashboard to set environment variables:
1. Visit https://railway.app/dashboard
2. Select your project
3. Go to Variables tab
4. Add all variables from `.env.example`

#### Step 4: Deploy

```bash
railway up
```

Railway auto-detects Node.js and deploys.

#### Step 5: Get Domain

```bash
railway domain
# Returns: https://your-app.railway.app
```

Update Google OAuth redirect URI accordingly.

---

### Option 3: DigitalOcean App Platform

#### Step 1: Connect GitHub

1. Push code to GitHub repository
2. Visit [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
3. Click "Create App"
4. Connect GitHub repository

#### Step 2: Configure Build

- **Type:** Web Service
- **Build Command:** `npm install`
- **Run Command:** `node app.js`
- **Port:** 3000

#### Step 3: Environment Variables

Add all variables from `.env.example` in app settings.

#### Step 4: Deploy

Click "Deploy" - DigitalOcean handles the rest.

---

### Option 4: AWS EC2 (Traditional server)

#### Step 1: Launch EC2 Instance

```bash
# Amazon Linux 2 or Ubuntu 22.04
# t2.micro (free tier eligible)
# Security group: Allow HTTP (80), HTTPS (443), SSH (22)
```

#### Step 2: Connect and Setup

```bash
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install Git
sudo yum install -y git

# Clone repository
git clone https://github.com/yourusername/TerreCoord-coordinator.git
cd TerreCoord-coordinator
```

#### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with production values
nano .env
```

#### Step 4: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Start application
pm2 start app.js --name TerreCoord

# Save PM2 configuration
pm2 save

# Auto-start on reboot
pm2 startup
```

#### Step 5: Configure Nginx (Reverse Proxy)

```bash
sudo yum install -y nginx

# Create config
sudo nano /etc/nginx/conf.d/TerreCoord.conf
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Step 6: SSL Certificate (Certbot)

```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Post-Deployment Tasks

### 1. Verify Deployment

```bash
# Check health endpoint
curl https://your-domain.com/health

# Expected response:
# {"status":"healthy","timestamp":"...","features":{...}}
```

### 2. Initial Authentication

Visit: `https://your-domain.com/auth/google`

Authorize application to access Google Calendar.

### 3. Test Core Features

- [ ] Submit test booking
- [ ] Check email notification received
- [ ] Approve booking from dashboard
- [ ] Verify PDF generation
- [ ] Test conflict detection
- [ ] Test edit functionality

### 4. Monitor Application

```bash
# Heroku
heroku logs --tail

# Railway
railway logs

# PM2 (EC2)
pm2 logs TerreCoord
pm2 monit
```

### 5. Set Up Monitoring (Optional)

**UptimeRobot** (Free)
1. Visit https://uptimerobot.com
2. Add monitor for your domain
3. Set check interval: 5 minutes
4. Email alerts on downtime

**Sentry** (Error tracking)
```bash
npm install @sentry/node
```

Add to `app.js`:
```javascript
const Sentry = require("@sentry/node");
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

---

## Scaling Considerations

### Database Migration (Future)

Current setup uses local JSON files. For high traffic:

1. **Migrate to PostgreSQL/MongoDB**
   - Store booking metadata
   - Cache calendar data
   - Track user sessions

2. **Add Redis Cache**
   - Cache Google Calendar responses
   - Rate limiting state
   - Session storage

### Load Balancing (High Traffic)

```bash
# Multiple instances behind load balancer
# Heroku example:
heroku ps:scale web=3
```

### CDN for Static Assets

```bash
# Serve CSS/JS from CDN
# Update views to use:
<link rel="stylesheet" href="https://cdn.yoursite.com/css/style.css">
```

---

## Backup Strategy

### 1. Database Backups (If using DB)

```bash
# PostgreSQL example
pg_dump TerreCoord > backup.sql

# MongoDB example
mongodump --db TerreCoord --out /backup
```

### 2. Configuration Backups

```bash
# Backup environment variables
heroku config -s > .env.production.backup

# Backup calendar config
cp calendars.json calendars.json.backup
```

### 3. Calendar Sync

Google Calendar is source of truth - no manual backup needed.

---

## Rollback Plan

### Heroku

```bash
# View releases
heroku releases

# Rollback to previous
heroku rollback v123
```

### Railway

```bash
railway rollback
```

### Git-Based Deployments

```bash
# Revert to previous commit
git revert HEAD
git push production main
```

---

## Production Environment Variables

### Required

```env
NODE_ENV=production
PORT=3000
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://your-domain.com/oauth2callback
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=16_char_app_password
EMAIL_FROM_NAME=TerreCoord Property Coordinator
APP_NAME=TerreCoord
APP_URL=https://your-domain.com
OWNER_EMAIL=owner@example.com
```

### Optional

```env
SESSION_SECRET=random_64_char_string
OWNER_DASHBOARD_PASSWORD=secure_password
SENTRY_DSN=https://xxx@sentry.io/xxx
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_PDF_GENERATION=true
ENABLE_CUSTOMS_DOCS=true
```

---

## Troubleshooting Production Issues

### Issue: "Application Error" on Heroku

**Check logs:**
```bash
heroku logs --tail
```

**Common causes:**
- Missing environment variable
- Port binding issue (use `process.env.PORT`)
- Dependencies not installed

### Issue: OAuth Redirect Mismatch

**Solution:**
1. Check Google Console redirect URI matches deployment URL exactly
2. Verify `GOOGLE_REDIRECT_URI` environment variable
3. Clear browser cookies and retry

### Issue: Emails Not Sending

**Solution:**
1. Verify Gmail app password (not account password)
2. Check `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASSWORD` set
3. Test SMTP credentials independently
4. Check Gmail security settings allow "Less secure apps"

### Issue: PDF Generation Fails

**Solution:**
1. Verify `pdfkit` installed in `node_modules`
2. Check sufficient memory (upgrade dyno if needed)
3. Review PDF generation code for errors
4. Test locally first

---

## Support & Maintenance

### Regular Tasks

- **Weekly:** Check error logs
- **Monthly:** Review Google Calendar API quota usage
- **Quarterly:** Update dependencies (`npm outdated`)
- **Yearly:** Rotate secrets (OAuth, email passwords)

### Monitoring Metrics

- Request response time
- Error rate
- Email delivery rate
- PDF generation success rate
- Calendar sync latency

---

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Use HTTPS only** - Redirect HTTP to HTTPS
3. **Keep dependencies updated** - `npm audit fix`
4. **Rate limit public endpoints** - Prevent abuse
5. **Sanitize inputs** - Already implemented
6. **Monitor logs** - Watch for suspicious activity
7. **Backup regularly** - Automate backups
8. **Document incidents** - Keep security log

---

## Success! 🎉

Your TerreCoord Property Coordinator is now live and ready to handle family bookings with customs documentation.

**Next steps:**
1. Share booking URL with family/friends
2. Monitor first few bookings closely
3. Collect feedback and iterate
4. Enjoy stress-free property coordination!

For questions, check the main README.md or create an issue.