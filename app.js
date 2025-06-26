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
