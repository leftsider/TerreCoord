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
