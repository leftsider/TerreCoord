const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { google } = require('googleapis');
const fs = require('fs');
const { getOAuth2Client, TOKEN_PATH } = require('./googleAuth');

const propertyConfigs = JSON.parse(fs.readFileSync(path.join(__dirname, 'calendars.json')));
const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

function isAuthenticated() {
    return fs.existsSync(TOKEN_PATH);
}

// Conflict detection (ignoring current event if editing)
async function isTimeSlotFree(startDate, endDate, calendarId, eventIdToIgnore = null) {
    try {
        const oAuth2Client = getOAuth2Client();
        if (!isAuthenticated()) return false;
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));

        const paddedEndObj = new Date(endDate); 
        paddedEndObj.setDate(paddedEndObj.getDate() + 1);
        const timeMax = paddedEndObj.toISOString().slice(0,10);

        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        const res = await calendar.events.list({
            calendarId,
            timeMin: new Date(startDate).toISOString(),
            timeMax: new Date(timeMax).toISOString(),
            singleEvents: true
        });

        return !(res.data.items || []).some(e => {
            if (eventIdToIgnore && e.id === eventIdToIgnore) return false;
            const eStart = new Date(e.start.date || e.start.dateTime);
            let eEnd = new Date(e.end.date || e.end.dateTime);
            if (e.end.date) eEnd.setDate(eEnd.getDate() - 1);
            const newStart = new Date(startDate);
            const newEnd = new Date(endDate);
            return (newStart <= eEnd && newEnd >= eStart);
        });
    } catch (err) {
        console.error('Calendar API error:', err);
        return false;
    }
}

// Index: Booking form with property selection
app.get('/', (req, res) => {
    const properties = {};
    for (const [key, value] of Object.entries(propertyConfigs)) {
        properties[key] = value.name;
    }
    res.render('index', {
        title: 'Property Coordinator',
        properties,
        formData: {},
        errors: [],
        success: null,
        debug: {}
    });
});

// Handle booking: uses selected property
app.post('/booking', async (req, res) => {
    const { name, email, startDate, endDate, property } = req.body;
    const errors = [];
    let calendarEventMatch = null;

    const calendarEntry = propertyConfigs[property];
    if (!calendarEntry) errors.push('Invalid property selected.');
    const propertyCalendarId = calendarEntry ? calendarEntry.id : null;

    if (!name || !email || !startDate || !endDate) {
        errors.push('All fields are required.');
    }
    if (new Date(startDate) > new Date(endDate)) {
        errors.push('Start date must be before end date.');
    }

    if (!propertyCalendarId) {
        return res.render('index', {
            title: 'Property Coordinator',
            properties: Object.fromEntries(Object.entries(propertyConfigs).map(([k, v]) => [k, v.name])),
            formData: { name, email, startDate, endDate, property },
            errors: errors,
            success: null,
            debug: {}
        });
    }

    if (errors.length === 0) {
        try {
            const isFree = await isTimeSlotFree(startDate, endDate, propertyCalendarId);
            if (!isFree) {
                errors.push('These dates are already booked on the calendar. Please choose different dates.');
            } else {
                const endObj = new Date(endDate);
                endObj.setDate(endObj.getDate() + 1);
                const endDatePadded = endObj.toISOString().slice(0, 10);

                const oAuth2Client = getOAuth2Client();
                oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
                const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
                await calendar.events.insert({
                    calendarId: propertyCalendarId,
                    requestBody: {
                        summary: `PENDING Booking: ${name}`,
                        description: `Booking for ${name} (${email})\nRequest received ${new Date().toISOString()}\nNot confirmed until owner approval.`,
                        start: { date: startDate },
                        end: { date: endDatePadded }
                    }
                });
            }
        } catch (err) {
            errors.push('Failed to create event on Google Calendar.');
        }
    }

    res.render('index', {
        title: 'Property Coordinator',
        properties: Object.fromEntries(Object.entries(propertyConfigs).map(([k, v]) => [k, v.name])),
        formData: errors.length > 0 ? { name, email, startDate, endDate, property } : {},
        errors,
        success: errors.length === 0 ? 'Your booking request has been received!' : null,
        debug: {}
    });
});

// --- Owner Dashboard: multiple property support ---
app.get('/owner', async (req, res) => {
    const property = req.query.property || Object.keys(propertyConfigs)[0];
    const calendarId = propertyConfigs[property].id;
    const ownerProperties = {};
    for (const [key, value] of Object.entries(propertyConfigs)) {
        ownerProperties[key] = value.name;
    }
    let bookings = [];
    let error = null;
    try {
        if (!fs.existsSync(TOKEN_PATH)) {
            return res.send("Google authentication required. Please <a href='/auth/google'>connect your account here</a>.");
        }

        const oAuth2Client = getOAuth2Client();
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        const now = new Date();
        const future = new Date(); future.setDate(now.getDate() + 90);

        const resp = await calendar.events.list({
            calendarId,
            timeMin: now.toISOString(),
            timeMax: future.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 50
        });

        bookings = (resp.data.items || []).map(e => {
            let status = 'approved';
            if (e.summary && e.summary.startsWith('PENDING')) status = 'pending';
            if (e.summary && (e.summary.startsWith('DECLINED') || e.summary.startsWith('CANCELLED'))) status = 'declined';
            if (e.summary && e.summary.startsWith('CONFIRMED')) status = 'confirmed';
            let displayEnd = e.end.date
                ? (() => { let d = new Date(e.end.date); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })()
                : (e.end.dateTime ? new Date(e.end.dateTime).toISOString().slice(0, 10) : undefined);
            return {
                eventId: e.id,
                summary: e.summary || 'No title',
                guest: e.description || '',
                start: e.start.date || (e.start.dateTime ? new Date(e.start.dateTime).toISOString().slice(0, 10) : ''),
                end: displayEnd,
                status
            };
        });
    } catch (err) {
        error = err.message;
    }

    res.render('owner', {
        title: 'Owner Dashboard',
        property,
        ownerProperties,
        bookings,
        error
    });
});

// - The following routes all take the property from req.query or fallback to first property key.
function getSelectedProperty(req) {
    return req.query.property || req.body.property || Object.keys(propertyConfigs)[0];
}

app.post('/owner/approve/:eventId', async (req, res) => {
    const property = getSelectedProperty(req);
    const calendarId = propertyConfigs[property].id;
    const eventId = req.params.eventId;
    try {
        const oAuth2Client = getOAuth2Client();
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        const result = await calendar.events.get({ calendarId, eventId });
        const event = result.data;

        if (!event || !event.summary) {
            return res.status(404).send('This booking event could not be found. It may have already been deleted or rejected.');
        }

        event.summary = event.summary.replace(/^PENDING /, 'CONFIRMED ');
        const approvalNote = `\nApproved on ${new Date().toISOString()}`;
        event.description = (event.description || '') + approvalNote;
        await calendar.events.patch({ calendarId, eventId, requestBody: event });

        res.redirect(`/owner?property=${property}`);
    } catch (err) {
        res.status(500).send('Failed to approve booking: ' + err.message);
    }
});

app.post('/owner/reject/:eventId', async (req, res) => {
    const property = getSelectedProperty(req);
    const calendarId = propertyConfigs[property].id;
    const eventId = req.params.eventId;
    try {
        const oAuth2Client = getOAuth2Client();
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        const result = await calendar.events.get({ calendarId, eventId });
        const event = result.data;

        event.summary = event.summary.replace(/^PENDING /, 'DECLINED ');
        const rejectionNote = `\nDeclined on ${new Date().toISOString()}`;
        event.description = (event.description || '') + rejectionNote;
        await calendar.events.patch({ calendarId, eventId, requestBody: event });
        await calendar.events.delete({ calendarId, eventId });

        res.redirect(`/owner?property=${property}`);
    } catch (err) {
        res.status(500).send('Failed to reject booking: ' + err.message);
    }
});

app.get('/owner/edit/:eventId', async (req, res) => {
    const property = getSelectedProperty(req);
    const calendarId = propertyConfigs[property].id;
    const eventId = req.params.eventId;
    let error = null;
    let event = {};
    try {
        const oAuth2Client = getOAuth2Client();
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        const { data } = await google.calendar({ version: 'v3', auth: oAuth2Client })
            .events.get({ calendarId, eventId });

        let displayEnd = data.end.date
            ? (() => { let d = new Date(data.end.date); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })()
            : (data.end.dateTime ? new Date(data.end.dateTime).toISOString().slice(0, 10) : '');
        event = {
            eventId,
            summary: data.summary || '',
            guest: (data.description && data.description.replace('Booking for ', '')) || '',
            start: data.start.date || (data.start.dateTime ? new Date(data.start.dateTime).toISOString().slice(0, 10) : ''),
            end: displayEnd
        };
    } catch (err) {
        error = 'Could not load booking: ' + err.message;
    }
    res.render('edit_booking', { title: 'Edit Booking', event, error, property });
});

// Edits with conflict detection
app.post('/owner/edit/:eventId', async (req, res) => {
    const property = getSelectedProperty(req);
    const calendarId = propertyConfigs[property].id;
    const eventId = req.params.eventId;
    const { summary, guest, start, end } = req.body;
    const errors = [];

    if (!summary || !guest || !start || !end) {
        errors.push('All fields are required.');
    }
    if (new Date(start) > new Date(end)) {
        errors.push('Start date must be before end date.');
    }
    if (errors.length === 0) {
        try {
            const oAuth2Client = getOAuth2Client();
            oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
            const isFree = await isTimeSlotFree(start, end, calendarId, eventId);
            if (!isFree) {
                errors.push('The new dates overlap with an existing booking. Please choose different dates.');
            } else {
                const endObj = new Date(end);
                endObj.setDate(endObj.getDate() + 1);
                const endDatePadded = endObj.toISOString().slice(0, 10);
                const approvalSuffix = summary.startsWith('CONFIRMED') ? '' : ' (Edited)';
                await google.calendar({ version: 'v3', auth: oAuth2Client })
                    .events.patch({
                        calendarId,
                        eventId,
                        requestBody: {
                            summary: summary + approvalSuffix,
                            description: `Booking for ${guest}\nModified on ${new Date().toISOString()}`,
                            start: { date: start },
                            end: { date: endDatePadded }
                        }
                    });
                return res.redirect(`/owner?property=${property}`);
            }
        } catch (err) {
            errors.push('Failed to check or update booking: ' + err.message);
        }
    }
    res.render('edit_booking', {
        title: 'Edit Booking',
        event: { eventId, summary, guest, start, end },
        error: errors.join(', '),
        property
    });
});

app.post('/owner/cancel/:eventId', async (req, res) => {
    const property = getSelectedProperty(req);
    const calendarId = propertyConfigs[property].id;
    const eventId = req.params.eventId;
    try {
        const oAuth2Client = getOAuth2Client();
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        await google.calendar({ version: 'v3', auth: oAuth2Client })
            .events.patch({
                calendarId,
                eventId,
                requestBody: {
                    summary: 'CANCELLED ' + req.body.summary,
                    description: (req.body.description || '') + `\nCancelled on ${new Date().toISOString()}`
                }
            });
        await google.calendar({ version: 'v3', auth: oAuth2Client })
            .events.delete({ calendarId, eventId });
        res.redirect(`/owner?property=${property}`);
    } catch (err) {
        res.status(500).send('Failed to cancel booking: ' + err.message);
    }
});

// --- Auth and utility ---
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
    const property = req.query.property || Object.keys(propertyConfigs)[0];
    const calendarId = propertyConfigs[property].id;
    const oAuth2Client = getOAuth2Client();
    if (isAuthenticated()) {
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        const events = await calendar.events.list({
            calendarId,
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

app.listen(PORT, () => {
    console.log(`🏡 Property Coordinator running on port ${PORT}`);
});
