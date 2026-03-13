# ⚡ Quick Start Guide - Get Running in 10 Minutes


## 🎯 Goal
Get TerreCoord running locally in under 10 minutes.

### Codespaces note
If you're developing in GitHub Codespaces, do not rely on localhost URLs in the browser.  
Use the forwarded URL from the PORTS tab instead, which will look like:

https://CODESPACENAME-3000.app.github.dev

If you use Google OAuth, set the port visibility to Public and use that forwarded URL for:
- GOOGLE_REDIRECT_URI
- APP_URL
- your Google Cloud OAuth redirect URI

---

## Step 1: Install Dependencies (2 minutes)

```bash
npm install
```

**Installs:**
- Express (web framework)
- Google Calendar API
- PDF generator
- Email sender
- All other dependencies

---

## Step 2: Configure Environment (3 minutes)

```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
# or
code .env
```

**Minimum required (for testing):**
```env
PORT=3000
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback

# Email (optional for testing - set to false)
ENABLE_EMAIL_NOTIFICATIONS=false
ENABLE_PDF_GENERATION=true
```

**Get Google credentials:**
1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable Calendar API → Create OAuth credentials
3. Set redirect URI: `http://localhost:3000/oauth2callback`
4. Copy Client ID and Secret

---

## Step 3: Configure Property (1 minute)

Edit `calendars.json`:

```json
{
  "myproperty": {
    "name": "My Vacation Home",
    "id": "your_calendar_id@group.calendar.google.com"
  }
}
```

**Find Calendar ID:**
Google Calendar → Settings → Select calendar → "Integrate calendar" section → Copy Calendar ID

---

## Step 4: Start Server (30 seconds)

```bash
npm start
```

**Expected output:**
```
🏡 TerreCoord Property Coordinator running on port 3000
📧 Email notifications: Disabled
📄 PDF generation: Enabled
```

---

## Step 5: Authenticate with Google (1 minute)

1. Open browser: `http://localhost:3000/auth/google`
2. Sign in with Google account
3. Click "Allow" to grant calendar access
4. You'll see: "Authentication successful!"

---

## Step 6: Test the App (2 minutes)

### Test Booking Form
1. Visit: `http://localhost:3000`
2. Fill out form:
   - Property: Your property name
   - Name: Test User
   - Email: your-email@example.com
   - Check-in: Tomorrow
   - Check-out: Day after tomorrow
3. Click "Submit Booking Request"
4. Should see success message

### Test Owner Dashboard
1. Visit: `http://localhost:3000/owner`
2. Should see your test booking with "Pending" status
3. Click "✓ Approve" button
4. Status changes to "Confirmed"
5. Click "📄 PDF" to download customs certificate

---

## ✅ Success!

**You're now running TerreCoord locally!**

**What's working:**
- ✅ Booking form submission
- ✅ Google Calendar sync
- ✅ Owner dashboard
- ✅ Conflict detection
- ✅ PDF generation
- ⚠️ Email (if configured)

---

## 🔧 Enable Email Notifications (Optional)

### Gmail Setup (5 minutes)

1. **Enable 2-Step Verification:**
   - Visit: https://myaccount.google.com/security
   - Turn on 2-Step Verification

2. **Generate App Password:**
   - Visit: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other device"
   - Copy 16-character password

3. **Update `.env`:**
   ```env
   ENABLE_EMAIL_NOTIFICATIONS=true
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
   EMAIL_FROM_NAME=TerreCoord Property Coordinator
   OWNER_EMAIL=owner@example.com
   ```

4. **Restart server:**
   ```bash
   # Stop server (Ctrl+C)
   npm start
   ```

5. **Test:**
   - Submit new booking
   - Check email inbox for confirmation

---

## 🎨 Customize Branding (Optional)

### Change App Name
Edit `views/index.ejs`, `views/owner.ejs`, `views/edit_booking.ejs`:

```html
<!-- Find and replace -->
<a href="/" class="header__brand">🏡 TerreCoord</a>

<!-- Change to -->
<a href="/" class="header__brand">🏡 Your Property Name</a>
```

### Change Colors
Edit `public/css/style.css`:

```css
:root {
  --color-primary: #2563eb;  /* Change to your color */
  --color-primary-hover: #1d4ed8;
}
```

### Add Property Photos
Edit booking form to include property image:

```html
<!-- In views/index.ejs, after header -->
<div style="text-align: center; margin: 2rem 0;">
  <img src="/images/property.jpg" alt="Property" style="max-width: 100%; border-radius: 1rem;">
</div>
```

---

## 📱 Test on Mobile

1. Find your local IP:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

2. On your phone's browser, visit:
   ```
   http://YOUR_LOCAL_IP:3000
   ```

3. Test responsive design:
   - Booking form
   - Owner dashboard
   - All buttons and interactions

---

## 🚀 Deploy to Production

Ready to go live? Follow **DEPLOYMENT.md** for:

- Heroku deployment (easiest)
- Railway.app (modern)
- DigitalOcean (scalable)
- AWS EC2 (traditional)

**Before deploying:**
1. Update Google OAuth redirect URI
2. Configure production environment variables
3. Test all features locally first
4. Set up email notifications
5. Review security checklist

---

## 🐛 Troubleshooting

### "Cannot find module 'express'"
**Solution:** Run `npm install`

### "Authentication required"
**Solution:** Visit `/auth/google` and authorize

### "Invalid calendar ID"
**Solution:** 
1. Check `calendars.json` has correct Calendar ID
2. Format: `something@group.calendar.google.com`
3. Not the calendar name, the actual ID

### "These dates are already booked"
**Solution:** This is working correctly! Try different dates or clear existing events from Google Calendar

### Emails not sending
**Solution:**
1. Check `.env` has `ENABLE_EMAIL_NOTIFICATIONS=true`
2. Verify Gmail app password (16 chars, no spaces)
3. For testing, set to `false` and skip emails

### Port already in use
**Solution:**
```bash
# Change port in .env
PORT=3001

# Or kill existing process
# Mac/Linux: lsof -ti:3000 | xargs kill -9
# Windows: netstat -ano | findstr :3000, then taskkill /PID [number] /F
```

---

## 📚 Next Steps

**Now that it's running:**

1. **Read FEATURES.md** - Learn all capabilities
2. **Invite test users** - Have family try booking
3. **Review dashboard** - Practice approve/reject workflow
4. **Download PDFs** - Verify customs certificates look good
5. **Prepare for production** - Follow DEPLOYMENT.md when ready

---

## 💡 Pro Tips

### Tip 1: Multiple Properties
Add to `calendars.json`:
```json
{
  "beach": {
    "name": "Beach House",
    "id": "beach@group.calendar.google.com"
  },
  "mountain": {
    "name": "Mountain Cabin",
    "id": "mountain@group.calendar.google.com"
  }
}
```

### Tip 2: Backup Your Config
```bash
cp .env .env.backup
cp calendars.json calendars.json.backup
cp token.json token.json.backup
```

### Tip 3: Monitor Logs
```bash
npm start | tee logs.txt
```
Saves all output to `logs.txt` while displaying it.

### Tip 4: Test Conflict Detection
1. Create booking: Jan 1-3
2. Try creating another: Jan 2-4
3. Should show error about dates being booked
4. This confirms conflict detection works!

### Tip 5: Health Check
Visit: `http://localhost:3000/health`

Shows system status and enabled features.

---

## ✅ Checklist: You're Ready When...

- [ ] Server starts without errors
- [ ] Can visit homepage (booking form)
- [ ] Can visit `/owner` (dashboard)
- [ ] Can submit test booking
- [ ] Booking appears in dashboard
- [ ] Can approve booking
- [ ] Can download PDF
- [ ] Can edit booking
- [ ] Can cancel booking
- [ ] Mobile responsive works
- [ ] Google Calendar shows events

---

## 🎉 Congratulations!

**You've successfully set up TerreCoord Property Coordinator!**

Your family can now:
- Submit booking requests online
- Receive email confirmations
- Get customs documentation automatically
- Avoid double bookings

You can:
- Manage all bookings from one dashboard
- Approve/reject with one click
- Download PDFs anytime
- Edit or cancel bookings
- Switch between multiple properties

**Need help?** Check README.md for comprehensive documentation.

**Ready to deploy?** Follow DEPLOYMENT.md for production setup.

**Enjoy stress-free property coordination! 🏡**