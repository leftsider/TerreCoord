require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { google } = require('googleapis');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const { getOAuth2Client, TOKEN_PATH } = require('./googleAuth');

// Load property configurations
const propertyConfigs = JSON.parse(fs.readFileSync(path.join(__dirname, 'calendars.json')));

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Email transporter setup
const emailTransporter = process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true' ? nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
}) : null;

// Helper Functions
function isAuthenticated() {
    return fs.existsSync(TOKEN_PATH);
}

async function isTimeSlotFree(startDate, endDate, calendarId, eventIdToIgnore = null) {
    try {
        const oAuth2Client = getOAuth2Client();
        if (!isAuthenticated()) return false;
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));

        const paddedEndObj = new Date(endDate);
        paddedEndObj.setDate(paddedEndObj.getDate() + 1);
        const timeMax = paddedEndObj.toISOString().slice(0, 10);

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

// PDF Generation for Customs Documentation
async function generateCustomsPDF(bookingData, propertyName) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('Property Occupancy Certificate', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text('For Customs and Immigration Purposes', { align: 'center' });
        doc.moveDown(2);

        // Document details
        doc.fontSize(14).text('Property Information', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11)
            .text(`Property: ${propertyName}`)
            .text(`Booking Reference: ${bookingData.eventId || 'N/A'}`)
            .text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
        doc.moveDown(1.5);

        // Guest information
        doc.fontSize(14).text('Guest Information', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11)
            .text(`Name: ${bookingData.name}`)
            .text(`Email: ${bookingData.email}`);
        doc.moveDown(1.5);

        // Booking dates
        doc.fontSize(14).text('Occupancy Period', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11)
            .text(`Check-in Date: ${new Date(bookingData.start).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`)
            .text(`Check-out Date: ${new Date(bookingData.end).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
        doc.moveDown(1.5);

        // Attestation
        doc.fontSize(14).text('Attestation', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10)
            .text('This document certifies that the above-named individual has a confirmed reservation for the specified property during the dates listed. This certificate is issued for customs and immigration verification purposes.', { align: 'justify' });
        doc.moveDown(2);

        // Signature section
        doc.fontSize(11).text('Property Owner/Manager', { continued: false });
        doc.moveDown(0.3);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.moveDown(3);

        // Footer
        doc.fontSize(8)
            .text('This is an automated document generated by TerreCoord Property Coordinator', { align: 'center', color: 'gray' });

        doc.end();
    });
}

// Email notification function
async function sendEmail(to, subject, html, attachments = []) {
    if (!emailTransporter || process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'true') {
        console.log('Email notifications disabled or not configured');
        return;
    }

    try {
        await emailTransporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || 'TerreCoord'}" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            attachments
        });
        console.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
        console.error('Email send error:', err);
    }
}

function getSelectedProperty(req) {
    return req.query.property || req.body.property || Object.keys(propertyConfigs)[0];
}

// Routes

// Home: Booking form
app.get('/', (req, res) => {
    const properties = {};
    for (const [key, value] of Object.entries(propertyConfigs)) {
        properties[key] = value.name;
    }
    res.render('index', {
        title: 'Book Your Stay',
        properties,
        formData: {},
        errors: [],
        success: null
    });
});

// Handle booking submission
app.post('/booking', async (req, res) => {
    const { name, email, startDate, endDate, property } = req.body;
    const errors = [];

    const calendarEntry = propertyConfigs[property];
    if (!calendarEntry) errors.push('Invalid property selected.');
    const propertyCalendarId = calendarEntry ? calendarEntry.id : null;

    if (!name || !email || !startDate || !endDate) {
        errors.push('All fields are required.');
    }
    if (new Date(startDate) > new Date(endDate)) {
        errors.push('Start date must be before end date.');
    }

    const properties = Object.fromEntries(Object.entries(propertyConfigs).map(([k, v]) => [k, v.name]));

    if (!propertyCalendarId) {
        return res.render('index', {
            title: 'Book Your Stay',
            properties,
            formData: { name, email, startDate, endDate, property },
            errors,
            success: null
        });
    }

    if (errors.length === 0) {
        try {
            const isFree = await isTimeSlotFree(startDate, endDate, propertyCalendarId);
            if (!isFree) {
                errors.push('These dates are already booked. Please choose different dates.');
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
                        description: `Booking request for ${name} (${email})\\nReceived: ${new Date().toISOString()}\\nStatus: Pending owner approval`,
                        start: { date: startDate },
                        end: { date: endDatePadded }
                    }
                });

                // Send confirmation email to guest
                await sendEmail(
                    email,
                    `Booking Request Received - ${calendarEntry.name}`,
                    `<h2>Thank you for your booking request!</h2>
                    <p>Hi ${name},</p>
                    <p>We've received your booking request for <strong>${calendarEntry.name}</strong>:</p>
                    <ul>
                        <li><strong>Check-in:</strong> ${new Date(startDate).toLocaleDateString()}</li>
                        <li><strong>Check-out:</strong> ${new Date(endDate).toLocaleDateString()}</li>
                    </ul>
                    <p>Your request is currently <strong>pending approval</strong>. You'll receive another email once the owner reviews your request.</p>
                    <p>Best regards,<br>TerreCoord Team</p>`
                );

                // Notify owner
                if (process.env.OWNER_EMAIL) {
                    await sendEmail(
                        process.env.OWNER_EMAIL,
                        `New Booking Request - ${calendarEntry.name}`,
                        `<h2>New Booking Request</h2>
                        <p>A new booking request has been submitted:</p>
                        <ul>
                            <li><strong>Property:</strong> ${calendarEntry.name}</li>
                            <li><strong>Guest:</strong> ${name} (${email})</li>
                            <li><strong>Dates:</strong> ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</li>
                        </ul>
                        <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/owner?property=${property}">Review in Dashboard</a></p>`
                    );
                }
            }
        } catch (err) {
            console.error('Booking error:', err);
            errors.push('Failed to create booking. Please try again.');
        }
    }

    res.render('index', {
        title: 'Book Your Stay',
        properties,
        formData: errors.length > 0 ? { name, email, startDate, endDate, property } : {},
        errors,
        success: errors.length === 0 ? 'Your booking request has been submitted! Check your email for confirmation.' : null
    });
});

// Owner Dashboard
app.get('/owner', async (req, res) => {
    const property = getSelectedProperty(req);
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
        const future = new Date();
        future.setDate(now.getDate() + 180); // 6 months ahead

        const resp = await calendar.events.list({
            calendarId,
            timeMin: now.toISOString(),
            timeMax: future.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 100
        });

        bookings = (resp.data.items || []).map(e => {
            let status = 'approved';
            if (e.summary && e.summary.startsWith('PENDING')) status = 'pending';
            if (e.summary && (e.summary.startsWith('DECLINED') || e.summary.startsWith('CANCELLED'))) status = 'declined';
            if (e.summary && e.summary.startsWith('CONFIRMED')) status = 'confirmed';

            // Extract guest info from description
            let guestName = 'Unknown';
            let guestEmail = '';
            if (e.description) {
                const nameMatch = e.description.match(/Booking (?:request )?for ([^(]+)/i);
                const emailMatch = e.description.match(/\(([^)]+@[^)]+)\)/);
                if (nameMatch) guestName = nameMatch[1].trim();
                if (emailMatch) guestEmail = emailMatch[1].trim();
            }

            let displayEnd = e.end.date
                ? (() => { let d = new Date(e.end.date); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })()
                : (e.end.dateTime ? new Date(e.end.dateTime).toISOString().slice(0, 10) : undefined);

            return {
                eventId: e.id,
                summary: e.summary || 'No title',
                guestName,
                guestEmail,
                start: e.start.date || (e.start.dateTime ? new Date(e.start.dateTime).toISOString().slice(0, 10) : ''),
                end: displayEnd,
                status,
                description: e.description || ''
            };
        });
    } catch (err) {
        error = err.message;
        console.error('Dashboard error:', err);
    }

    res.render('owner', {
        title: 'Owner Dashboard',
        property,
        propertyName: propertyConfigs[property].name,
        ownerProperties,
        bookings,
        error
    });
});

// Approve booking
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
            return res.status(404).send('Booking not found. It may have been deleted.');
        }

        // Extract guest info
        let guestName = 'Guest';
        let guestEmail = '';
        if (event.description) {
            const nameMatch = event.description.match(/Booking (?:request )?for ([^(]+)/i);
            const emailMatch = event.description.match(/\(([^)]+@[^)]+)\)/);
            if (nameMatch) guestName = nameMatch[1].trim();
            if (emailMatch) guestEmail = emailMatch[1].trim();
        }

        event.summary = event.summary.replace(/^PENDING /, 'CONFIRMED ');
        const approvalNote = `\\nApproved: ${new Date().toISOString()}`;
        event.description = (event.description || '') + approvalNote;

        await calendar.events.patch({ calendarId, eventId, requestBody: event });

        // Generate customs PDF
        let pdfBuffer = null;
        if (process.env.ENABLE_PDF_GENERATION === 'true' && process.env.ENABLE_CUSTOMS_DOCS === 'true') {
            pdfBuffer = await generateCustomsPDF({
                eventId,
                name: guestName,
                email: guestEmail,
                start: event.start.date || event.start.dateTime,
                end: event.end.date || event.end.dateTime
            }, propertyConfigs[property].name);
        }

        // Send approval email with PDF
        if (guestEmail) {
            const attachments = pdfBuffer ? [{
                filename: `booking-certificate-${eventId}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }] : [];

            await sendEmail(
                guestEmail,
                `Booking Approved - ${propertyConfigs[property].name}`,
                `<h2>Your Booking Has Been Approved!</h2>
                <p>Hi ${guestName},</p>
                <p>Great news! Your booking request for <strong>${propertyConfigs[property].name}</strong> has been approved:</p>
                <ul>
                    <li><strong>Check-in:</strong> ${new Date(event.start.date || event.start.dateTime).toLocaleDateString()}</li>
                    <li><strong>Check-out:</strong> ${new Date(event.end.date || event.end.dateTime).toLocaleDateString()}</li>
                </ul>
                ${pdfBuffer ? '<p>A customs certificate is attached to this email for your travel documentation needs.</p>' : ''}
                <p>We look forward to hosting you!</p>
                <p>Best regards,<br>TerreCoord Team</p>`,
                attachments
            );
        }

        res.redirect(`/owner?property=${property}`);
    } catch (err) {
        console.error('Approve error:', err);
        res.status(500).send('Failed to approve booking: ' + err.message);
    }
});

// Reject booking
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

        // Extract guest info for email
        let guestName = 'Guest';
        let guestEmail = '';
        if (event.description) {
            const nameMatch = event.description.match(/Booking (?:request )?for ([^(]+)/i);
            const emailMatch = event.description.match(/\(([^)]+@[^)]+)\)/);
            if (nameMatch) guestName = nameMatch[1].trim();
            if (emailMatch) guestEmail = emailMatch[1].trim();
        }

        event.summary = event.summary.replace(/^PENDING /, 'DECLINED ');
        const rejectionNote = `\\nDeclined: ${new Date().toISOString()}`;
        event.description = (event.description || '') + rejectionNote;

        await calendar.events.patch({ calendarId, eventId, requestBody: event });
        await calendar.events.delete({ calendarId, eventId });

        // Send rejection email
        if (guestEmail) {
            await sendEmail(
                guestEmail,
                `Booking Request Update - ${propertyConfigs[property].name}`,
                `<h2>Booking Request Update</h2>
                <p>Hi ${guestName},</p>
                <p>We're sorry, but your booking request for <strong>${propertyConfigs[property].name}</strong> could not be approved for the requested dates.</p>
                <p>The property may already be booked during that period. Please feel free to submit another request for different dates.</p>
                <p>Best regards,<br>TerreCoord Team</p>`
            );
        }

        res.redirect(`/owner?property=${property}`);
    } catch (err) {
        console.error('Reject error:', err);
        res.status(500).send('Failed to reject booking: ' + err.message);
    }
});

// Edit booking form
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

        let guestName = 'Unknown';
        let guestEmail = '';
        if (data.description) {
            const nameMatch = data.description.match(/Booking (?:request )?for ([^(]+)/i);
            const emailMatch = data.description.match(/\(([^)]+@[^)]+)\)/);
            if (nameMatch) guestName = nameMatch[1].trim();
            if (emailMatch) guestEmail = emailMatch[1].trim();
        }

        let displayEnd = data.end.date
            ? (() => { let d = new Date(data.end.date); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })()
            : (data.end.dateTime ? new Date(data.end.dateTime).toISOString().slice(0, 10) : '');

        event = {
            eventId,
            summary: data.summary || '',
            guestName,
            guestEmail,
            start: data.start.date || (data.start.dateTime ? new Date(data.start.dateTime).toISOString().slice(0, 10) : ''),
            end: displayEnd
        };
    } catch (err) {
        error = 'Could not load booking: ' + err.message;
    }

    res.render('edit_booking', {
        title: 'Edit Booking',
        event,
        error,
        property,
        propertyName: propertyConfigs[property].name
    });
});

// Update booking
app.post('/owner/edit/:eventId', async (req, res) => {
    const property = getSelectedProperty(req);
    const calendarId = propertyConfigs[property].id;
    const eventId = req.params.eventId;
    const { summary, guestName, guestEmail, start, end } = req.body;
    const errors = [];

    if (!summary || !guestName || !start || !end) {
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
                            description: `Booking request for ${guestName} (${guestEmail})\\nLast modified: ${new Date().toISOString()}`,
                            start: { date: start },
                            end: { date: endDatePadded }
                        }
                    });

                // Notify guest of changes if approved
                if (summary.startsWith('CONFIRMED') && guestEmail) {
                    await sendEmail(
                        guestEmail,
                        `Booking Updated - ${propertyConfigs[property].name}`,
                        `<h2>Your Booking Has Been Updated</h2>
                        <p>Hi ${guestName},</p>
                        <p>Your booking for <strong>${propertyConfigs[property].name}</strong> has been updated:</p>
                        <ul>
                            <li><strong>New Check-in:</strong> ${new Date(start).toLocaleDateString()}</li>
                            <li><strong>New Check-out:</strong> ${new Date(end).toLocaleDateString()}</li>
                        </ul>
                        <p>Best regards,<br>TerreCoord Team</p>`
                    );
                }

                return res.redirect(`/owner?property=${property}`);
            }
        } catch (err) {
            console.error('Edit error:', err);
            errors.push('Failed to update booking: ' + err.message);
        }
    }

    res.render('edit_booking', {
        title: 'Edit Booking',
        event: { eventId, summary, guestName, guestEmail, start, end },
        error: errors.join(', '),
        property,
        propertyName: propertyConfigs[property].name
    });
});

// Cancel booking
app.post('/owner/cancel/:eventId', async (req, res) => {
    const property = getSelectedProperty(req);
    const calendarId = propertyConfigs[property].id;
    const eventId = req.params.eventId;

    try {
        const oAuth2Client = getOAuth2Client();
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

        // Get event details before deletion for email
        const { data: event } = await calendar.events.get({ calendarId, eventId });
        let guestEmail = '';
        let guestName = 'Guest';
        if (event.description) {
            const emailMatch = event.description.match(/\(([^)]+@[^)]+)\)/);
            const nameMatch = event.description.match(/Booking (?:request )?for ([^(]+)/i);
            if (emailMatch) guestEmail = emailMatch[1].trim();
            if (nameMatch) guestName = nameMatch[1].trim();
        }

        await calendar.events.patch({
            calendarId,
            eventId,
            requestBody: {
                summary: 'CANCELLED ' + (event.summary || ''),
                description: (event.description || '') + `\\nCancelled: ${new Date().toISOString()}`
            }
        });
        await calendar.events.delete({ calendarId, eventId });

        // Notify guest of cancellation
        if (guestEmail) {
            await sendEmail(
                guestEmail,
                `Booking Cancelled - ${propertyConfigs[property].name}`,
                `<h2>Booking Cancellation Notice</h2>
                <p>Hi ${guestName},</p>
                <p>Your booking for <strong>${propertyConfigs[property].name}</strong> has been cancelled.</p>
                <p>If you have any questions, please contact the property owner.</p>
                <p>Best regards,<br>TerreCoord Team</p>`
            );
        }

        res.redirect(`/owner?property=${property}`);
    } catch (err) {
        console.error('Cancel error:', err);
        res.status(500).send('Failed to cancel booking: ' + err.message);
    }
});

// Download customs PDF for existing booking
app.get('/owner/download-pdf/:eventId', async (req, res) => {
    const property = getSelectedProperty(req);
    const calendarId = propertyConfigs[property].id;
    const eventId = req.params.eventId;

    try {
        const oAuth2Client = getOAuth2Client();
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        const { data: event } = await calendar.events.get({ calendarId, eventId });

        let guestName = 'Guest';
        let guestEmail = '';
        if (event.description) {
            const nameMatch = event.description.match(/Booking (?:request )?for ([^(]+)/i);
            const emailMatch = event.description.match(/\(([^)]+@[^)]+)\)/);
            if (nameMatch) guestName = nameMatch[1].trim();
            if (emailMatch) guestEmail = emailMatch[1].trim();
        }

        const pdfBuffer = await generateCustomsPDF({
            eventId,
            name: guestName,
            email: guestEmail,
            start: event.start.date || event.start.dateTime,
            end: event.end.date || event.end.dateTime
        }, propertyConfigs[property].name);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="booking-certificate-${eventId}.pdf"`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('PDF download error:', err);
        res.status(500).send('Failed to generate PDF: ' + err.message);
    }
});

// Authentication routes
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
    try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        res.send('Authentication successful! You can close this window and return to the application.');
    } catch (err) {
        console.error('OAuth error:', err);
        res.status(500).send('Authentication failed: ' + err.message);
    }
});

// Utility route for listing events (debugging)
app.get('/list-events', async (req, res) => {
    const property = req.query.property || Object.keys(propertyConfigs)[0];
    const calendarId = propertyConfigs[property].id;
    const oAuth2Client = getOAuth2Client();

    if (isAuthenticated()) {
        try {
            oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
            const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
            const events = await calendar.events.list({
                calendarId,
                timeMin: new Date().toISOString(),
                maxResults: 25,
                singleEvents: true,
                orderBy: 'startTime',
            });
            res.json(events.data.items);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } else {
        res.redirect('/auth/google');
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        features: {
            emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
            pdfGeneration: process.env.ENABLE_PDF_GENERATION === 'true',
            customsDocs: process.env.ENABLE_CUSTOMS_DOCS === 'true'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🏡 TerreCoord Property Coordinator running on port ${PORT}`);
    console.log(`📧 Email notifications: ${process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true' ? 'Enabled' : 'Disabled'}`);
    console.log(`📄 PDF generation: ${process.env.ENABLE_PDF_GENERATION === 'true' ? 'Enabled' : 'Disabled'}`);
});