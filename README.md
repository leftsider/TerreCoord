# 🏡 TerreCoord v1.0

An app for coordinating pied a terre usage among family and friends, with built-in customs documentation generation because customs likes it when you have proof of reservation.

## Features

#### Core Booking Management
- **Booking form** with date picker and availability checking
- **Conflict detection** to prevent double bookings
- **Multi-property support**
- **Owner approval workflow** 
- **Edit bookings** - modify dates, guest info, and details
- **Cancel bookings** - with guest notification

#### Customs Documentation
- **Automated PDF generation** for customs/immigration purposes
- **Professional certificate format** with booking details
- **Auto-attached to approval emails**

#### Email Notifications 
- **Guest confirmations** when booking submitted
- **Owner notifications** of new booking requests
- **Approval emails** with customs PDF attached
- **Rejection notifications** 
- **Booking modification alerts** when dates change

#### Google Calendar Integration
- **Two-way sync** with Google Calendar
- **Visual calendar blocking** for occupied dates
- **Automatic conflict detection**

#### Owner Dashboard
- **Real-time statistics** (total, pending, confirmed, declined)
- **Property switcher** for multi-property management
- **Status badges** 
- **Quick actions** for approve/reject/edit/cancel
- **PDF download** for approved bookings

### 🎨 Design & UX
- **Fully responsive** - works on mobile, tablet, desktop
- **Dark mode support** (automatic based on system preference)
- **Accessible** - WCAG compliant with proper ARIA labels
- **Empty states** with helpful messaging

## 📦 Project Structure

```
terrecoord/
├── app.js                 # Main Express server with all routes
├── googleAuth.js          # OAuth 2.0 configuration (existing)
├── package.json           # Dependencies and scripts
├── .env                   # Environment configuration (create from .env.example)
├── .env.example           # Environment template
├── calendars.json         # Property/calendar mappings
├── views/
│   ├── index.ejs          # Public booking form
│   ├── owner.ejs          # Owner dashboard
│   └── edit_booking.ejs   # Edit booking interface
├── public/
│   ├── css/
│   │   └── style.css      # Complete design system
│   └── js/
│       └── client.js      # Client-side enhancements
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Google Cloud Console account
- Gmail account or SMTP service for emails

### 1. Install Dependencies

```bash
npm install
```

### 2. Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:3000/oauth2callback`
5. Copy Client ID and Client Secret

### 3. Email Configuration (Gmail)

1. Go to your [Google Account settings](https://myaccount.google.com)
2. Navigate to Security → 2-Step Verification
3. Scroll to "App passwords"
4. Generate new app password for "Mail"
5. Copy the 16-character password

### 4. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=3000
GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_actual_client_secret
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your_16_char_app_password
OWNER_EMAIL=owner@example.com
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_PDF_GENERATION=true
ENABLE_CUSTOMS_DOCS=true
```

### 5. Configure Properties

Edit `calendars.json`:

```json
{
  "myproperty": {
    "name": "My Vacation Home",
    "id": "your_google_calendar_id@group.calendar.google.com"
  }
}
```

**Finding your Calendar ID:**
1. Open Google Calendar
2. Click settings (gear icon) → Settings
3. Select your calendar from left sidebar
4. Scroll to "Integrate calendar"
5. Copy "Calendar ID"

### 6. Authenticate with Google

```bash
npm start
```

Visit `http://localhost:3000/auth/google` and authorize the application.

### 7. Test the Application

- **Booking form:** `http://localhost:3000`
- **Owner dashboard:** `http://localhost:3000/owner`
- **System health:** `http://localhost:3000/health`

## 📧 Email Configuration Options

### Option 1: Gmail (Recommended for testing)
Already configured in setup above.

### Option 2: SendGrid
```env
EMAIL_SERVICE=SendGrid
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
```

### Option 3: Mailgun
```env
EMAIL_SERVICE=Mailgun
EMAIL_USER=your_mailgun_smtp_user
EMAIL_PASSWORD=your_mailgun_password
```

### Option 4: Custom SMTP
```env
EMAIL_SERVICE=custom
SMTP_HOST=smtp.example.com
SMTP_PORT=587
EMAIL_USER=user@example.com
EMAIL_PASSWORD=password
```

## 🔧 Configuration

### Feature Flags

Control features via environment variables:

```env
ENABLE_EMAIL_NOTIFICATIONS=true  # Send emails to guests/owners
ENABLE_PDF_GENERATION=true       # Generate customs documents
ENABLE_CUSTOMS_DOCS=true         # Include customs PDFs in emails
```

### Multi-Property Setup

Add properties to `calendars.json`:

```json
{
  "beach": {
    "name": "Beach House",
    "id": "beach@group.calendar.google.com"
  },
  "mountain": {
    "name": "Mountain Cabin", 
    "id": "mountain@group.calendar.google.com"
  },
  "city": {
    "name": "City Apartment",
    "id": "city@group.calendar.google.com"
  }
}
```

## 📝 Usage Guide

### For Guests (Booking)

1. Visit the homepage
2. Select property from dropdown
3. Enter your name and email
4. Choose check-in and check-out dates
5. Click "Submit Booking Request"
6. Check email for confirmation

### For Owners (Management)

1. Visit `/owner` dashboard
2. Review pending bookings (yellow badges)
3. Click "Approve" to confirm booking
   - Guest receives approval email
   - Customs PDF automatically attached
4. Click "Reject" to decline
   - Guest receives polite rejection
   - Event removed from calendar
5. Use "Edit" to modify booking details
6. Use "Cancel" to cancel confirmed bookings
7. Download PDFs anytime from dashboard

### Customs Certificate

The PDF includes:
- Property name and booking reference
- Guest name and email
- Check-in and check-out dates
- Professional attestation for customs
- Auto-generated date stamp

Perfect for immigration/customs officers to verify property occupancy.

## 🔒 Security Considerations

### Production Deployment

1. **Use HTTPS** - Never deploy without SSL/TLS
2. **Environment variables** - Never commit `.env` file
3. **Owner authentication** - Add password protection:
   ```env
   OWNER_DASHBOARD_PASSWORD=secure_password
   ```
4. **Rate limiting** - Add express-rate-limit for booking form
5. **Input sanitization** - Already implemented for XSS prevention

### Token Storage

`token.json` contains Google OAuth credentials. Keep secure:
```bash
# Add to .gitignore
token.json
.env
node_modules/
```

## 🐛 Troubleshooting

### "Authentication required" Error
**Solution:** Visit `/auth/google` and authorize the app.

### Bookings Not Syncing
**Solution:** 
1. Check `calendars.json` has correct Calendar IDs
2. Verify Calendar API is enabled in Google Cloud
3. Delete `token.json` and re-authenticate

### Emails Not Sending
**Solution:**
1. Verify Gmail app password is 16 characters (no spaces)
2. Check `ENABLE_EMAIL_NOTIFICATIONS=true` in `.env`
3. Test credentials with online SMTP tester

### PDF Generation Fails
**Solution:**
1. Verify `pdfkit` installed: `npm list pdfkit`
2. Check `ENABLE_PDF_GENERATION=true`
3. Review server logs for PDF errors

### Conflicts Not Detected
**Solution:**
1. Ensure date format is YYYY-MM-DD
2. Check calendar permissions (app needs write access)
3. Verify `isTimeSlotFree()` function logic

## 📊 API Endpoints

### Public Routes
- `GET /` - Booking form
- `POST /booking` - Submit booking request
- `GET /health` - System health check

### Owner Routes
- `GET /owner` - Dashboard (requires auth)
- `POST /owner/approve/:eventId` - Approve booking
- `POST /owner/reject/:eventId` - Reject booking
- `GET /owner/edit/:eventId` - Edit form
- `POST /owner/edit/:eventId` - Update booking
- `POST /owner/cancel/:eventId` - Cancel booking
- `GET /owner/download-pdf/:eventId` - Download customs PDF

### Auth Routes
- `GET /auth/google` - Start OAuth flow
- `GET /oauth2callback` - OAuth callback

### Utility Routes
- `GET /list-events` - List calendar events (JSON)

## 🎯 Success Metrics (from PRD)

✅ **100% customs documentation generation** - Implemented  
✅ **Conflict detection** - Real-time validation  
✅ **Email notifications** - All stakeholders notified  
✅ **Owner approval workflow** - Complete dashboard  
✅ **Multi-property support** - Configurable via JSON  

## 🚢 Deployment

### Heroku

```bash
# Install Heroku CLI, then:
heroku create terrecoord
heroku config:set GOOGLE_CLIENT_ID=xxx
heroku config:set GOOGLE_CLIENT_SECRET=xxx
heroku config:set EMAIL_USER=xxx
heroku config:set EMAIL_PASSWORD=xxx
git push heroku main
```

Update redirect URI in Google Console to:
`https://bryandb-coordinator.herokuapp.com/oauth2callback`

### Railway

```bash
railway login
railway init
railway add
# Set environment variables in Railway dashboard
railway up
```

### DigitalOcean App Platform

1. Create new app from GitHub repo
2. Set environment variables in app settings
3. Deploy


## 📚 Additional Resources

- [Google Calendar API Docs](https://developers.google.com/calendar)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [PDFKit Documentation](https://pdfkit.org/)
- [Nodemailer Setup](https://nodemailer.com/about/)

## 🤝 Contributing

This is a personal project, but suggestions welcome via issues.

## 📄 License

MIT License - Use freely for personal projects.
