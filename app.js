// Temporary in-memory bookings store
//const bookings = [];

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { google } = require('googleapis');
const fs = require('fs');
const { getOAuth2Client, TOKEN_PATH } = require('./googleAuth');

// Load calendar IDs
const calendars = JSON.parse(fs.readFileSync(path.join(__dirname, 'calendars.json')));
const PROPERTY_KEY = 'campbell_ave'; // Update this as needed for other properties

const app = express();
const PORT = process.env.PORT || 3000;

// Set up EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Utility: Is Google OAuth token present?
function isAuthenticated() {
    return fs.existsSync(TOKEN_PATH);
}

// Utility: Ask Google Calendar if slot is busy
async function isTimeSlotFree(startDate, endDate, calendarId) {
    try {
        const oAuth2Client = getOAuth2Client();
        if (!isAuthenticated()) return false;
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
    } catch (err) {
        console.error('Calendar API error:', err);
        return false;
    }
}

// Utility: Check if submitted booking actually shows up on calendar
async function bookingExistsOnCalendar(startDate, endDate, calendarId) {
    try {
        const oAuth2Client = getOAuth2Client();
        if (!isAuthenticated()) return false;
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        const res = await calendar.events.list({
            calendarId,
            timeMin: new Date(startDate).toISOString(),
            timeMax: new Date(endDate).toISOString(),
            singleEvents: true
        });
        return res.data.items.some(event =>
            event.start && event.end &&
            (
                (event.start.date && event.start.date <= endDate) &&
                (event.end.date && event.end.date >= startDate)
            )
        );
    } catch (err) {
        return `Error: ${err.message}`;
    }
}

// GET main page with initial debug info
app.get('/', (req, res) => {
    const debug = {
        authEstablished: isAuthenticated(),
        calendarId: calendars[PROPERTY_KEY],
        submittedDates: null,
        calendarEventMatch: null
    };
    res.render('index', {
        title: 'Property Coordinator',
        formData: {},
        errors: [],
        success: null,
        debug
    });
});

// POST booking logic with debug support
app.post('/booking', async (req, res) => {
    const { name, email, startDate, endDate } = req.body;
    const errors = [];
    let calendarEventMatch = null;

    // Basic form checks
    if (!name || !email || !startDate || !endDate) {
        errors.push('All fields are required.');
    }
    if (new Date(startDate) > new Date(endDate)) {
        errors.push('Start date must be before end date.');
    }

    const propertyCalendarId = calendars[PROPERTY_KEY];

    // Google Calendar conflict detection and booking logic
    if (errors.length === 0) {
        try {
            const isFree = await isTimeSlotFree(startDate, endDate, propertyCalendarId);
            if (!isFree) {
                errors.push('These dates are already booked on the calendar. Please choose different dates.');
            } else {
                // Insert the booking as a new event in Google Calendar
                try {
                    const oAuth2Client = getOAuth2Client();
                    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
                    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
                    const endObj = new Date(endDate);
                    endObj.setDate(endObj.getDate() + 1);
                    const endDatePadded = endObj.toISOString().slice(0, 10); // "YYYY-MM-DD"
                    await calendar.events.insert({
                        calendarId: propertyCalendarId,
                        requestBody: {
                            summary: `Booking: ${name}`,
                            description: `Booking for ${name} (${email})`,
                            start: { date: startDate },
                            end:   { date: endDatePadded },                        }
                    });
                } catch (err) {
                    errors.push('Failed to create event on Google Calendar.');
                }
            }
            // Debug: does the event now exist on the calendar?
            calendarEventMatch = await bookingExistsOnCalendar(startDate, endDate, propertyCalendarId);
        } catch (err) {
            errors.push('Could not check calendar availability. Please try again later.');
        }
    }

    // Assemble debug info for all POST renders
    const debug = {
        authEstablished: isAuthenticated(),
        calendarId: propertyCalendarId,
        submittedDates: { startDate, endDate },
        calendarEventMatch
    };

    if (errors.length > 0) {
        return res.render('index', {
            title: 'Property Coordinator',
            errors,
            formData: { name, email, startDate, endDate },
            success: null,
            debug
        });
    }

    res.render('index', {
        title: 'Property Coordinator',
        success: 'Your booking request has been received!',
        formData: {},
        errors: [],
        debug
    });
});

// --- Standard Auth/API routes ---

app.listen(PORT, () => {
    console.log(`🏡 Property Coordinator running on port ${PORT}`);
});

app.get('/auth/google', (req, res) => {
    const oAuth2Client = getOAuth2Client();
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar'],
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
    if (isAuthenticated()) {
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
