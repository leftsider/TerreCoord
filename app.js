// Temporary in-memory bookings store
const bookings = [];

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Basic route
app.get('/', (req, res) => {
    res.render('index', { title: 'Property Coordinator' });
});

app.listen(PORT, () => {
    console.log(`🏡 Property Coordinator running on port ${PORT}`);
});

app.post('/booking', (req, res) => {
    const { name, email, startDate, endDate } = req.body;
    const errors = [];

    // Basic validation
    if (!name || !email || !startDate || !endDate) {
        errors.push('All fields are required.');
    }
    if (new Date(startDate) > new Date(endDate)) {
        errors.push('Start date must be before end date.');
    }

    // Conflict detection
    const hasConflict = bookings.some(booking => {
        return (
            (new Date(startDate) <= new Date(booking.endDate)) &&
            (new Date(endDate) >= new Date(booking.startDate))
        );
    });

    if (hasConflict) {
        errors.push('These dates are already booked. Please choose different dates.');
    }

    if (errors.length > 0) {
        // Render form with errors
        return res.render('index', { 
            title: 'Property Coordinator', 
            errors, 
            formData: { name, email, startDate, endDate }
        });
    }

    // Store booking
    bookings.push({ name, email, startDate, endDate });
    res.render('index', { 
        title: 'Property Coordinator', 
        success: 'Your booking request has been received!', 
        formData: {}
    });
});

const { getOAuth2Client, TOKEN_PATH } = require('./googleAuth');
const { google } = require('googleapis');
const fs = require('fs');

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
        const events = await calendar.events.list({
            calendarId: 'primary',
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
