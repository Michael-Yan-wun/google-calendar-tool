const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// OAuth2 Client Setup
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
);

// Routes
app.get('/auth/google', (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
    ];
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });
    res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        // In a real app, you'd save these tokens to a database associated with a user session
        // For this simple tool, we'll just keep it in memory or send it back to client (insecure but simple)
        // Or better, set a cookie. For now, let's redirect to home with a success query param
        res.redirect('/?auth=success');
    } catch (error) {
        console.error('Error retrieving access token', error);
        res.redirect('/?auth=error');
    }
});

// API Routes
const calendarService = require('./services/calendarService');
const geminiService = require('./services/geminiService');

app.get('/api/calendar/events', async (req, res) => {
    try {
        const events = await calendarService.listEvents();
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/calendar/events', async (req, res) => {
    try {
        const event = await calendarService.insertEvent(req.body);
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/calendar/events/:id', async (req, res) => {
    try {
        const event = await calendarService.updateEvent(req.params.id, req.body);
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/calendar/events/:id', async (req, res) => {
    try {
        await calendarService.deleteEvent(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        // Fetch current context (events) to help Gemini understand "free time" or "conflicts"
        const currentEvents = await calendarService.listEvents();

        const result = await geminiService.processUserIntent(message, currentEvents);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Export oauth2Client for services to use (if we keep it singleton for this single-user tool)
module.exports = { oauth2Client };
