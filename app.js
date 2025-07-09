// Temporary in-memory bookings store
const bookings = [];

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { google } = require('googleapis');
const fs = require('fs');
const { getOAuth2Client, TOKEN_PATH } = require('./googleAuth');

// Load property calendar IDs (not tracked by git)
const calendars = JSON.parse(fs.readFileSync(path.join(__dirname, 'calendars.json')));
const PROPERTY_KEY = 'campbell_ave'; // For now, hardcoded. Make dynamic later if needed.

const app = express();
const PORT = process.env.PORT || 3000;

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Check Google Calendar for conflicts (now takes calendarId)
async function isTimeSlotFree(startDate, endDate, calendarId) {
    try {
        const oAuth2Client = getOAuth2Client();
        if (fs.existsSync(TOKEN_PATH)) {
            oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
            const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

            const res = await calendar.freebusy.query({
                requestBody: {
                    timeMin: new Date(startDate).toISOString(),
                    timeMax: new Date(endDate).toISOString(),
                    items: [{ id: calendarId }]
                }
            });

            const busySlots = res.data.calendars[calendarId].busy;
            return busySlots.length === 0;
        }
        return false;
    } catch (err) {
        console.error('Calendar API error:', err);
        return false;
    }
}

// Basic route
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'Property Coordinator',
        formData: {},
        errors: [],
        success: null
    });
});

// Booking route with calendar conflict integration
app.post('/booking', async (req, res) => {
    const { name, email, startDate, endDate } = req.body;
    const errors = [];

    // Basic validation
    if (!name || !email || !startDate || !endDate) {
        errors.push('All fields are required.');
    }
    if (new Date(startDate) > new Date(endDate)) {
        errors.push('Start date must be before end date.');
    }

    // Only check calendar if basic validation passes
    if (errors.length === 0) {
        try {
            const propertyCalendarId = calendars[PROPERTY_KEY];
            const isFree = await isTimeSlotFree(startDate, endDate, propertyCalendarId);
            if (!isFree) {
                errors.push('These dates are already booked on the calendar. Please choose different dates.');
            }
        } catch (err) {
            errors.push('Could not check calendar availability. Please try again later.');
        }
    }

    if (errors.length > 0) {
        return res.render('index', { 
            title: 'Property Coordinator', 
            errors, 
            formData: { name, email, startDate, endDate },
            success: null
        });
    }

    bookings.push({ name, email, startDate, endDate });
    res.render('index', { 
        title: 'Property Coordinator', 
        success: 'Your booking request has been received!', 
        formData: {},
        errors: []
    });
});

app.listen(PORT, () => {
    console.log(`🏡 Property Coordinator running on port ${PORT}`);
});

// Google Auth routes remain unchanged
app.get('/auth/google', (req, res) => {
    const oAuth2Client = getOAuth2Client();
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    });
    res.redirect(authUrl);
});

app.get('/oauth2callback', async (req, res) => {
    const oAuth2Client = getOAuth2Client();
    const code = req.query.code;
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send('Authentication successful! You can close this window.');
});

app.get('/list-events', async (req, res) => {
    const oAuth2Client = getOAuth2Client();
    if (fs.existsSync(TOKEN_PATH)) {
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        const propertyCalendarId = calendars[PROPERTY_KEY];
        const events = await calendar.events.list({
            calendarId: propertyCalendarId,
            timeMin: new Date().toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });
        res.json(events.data.items);
    } else {
        res.redirect('/auth/google');
    }
});
