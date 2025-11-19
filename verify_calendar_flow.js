const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
);

app.get('/', (req, res) => {
    res.send('<h1>Calendar Verification</h1><a href="/test-auth">Click here to start verification</a>');
});

app.get('/test-auth', (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
    ];
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });
    console.log("Redirecting to:", url);
    res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    console.log("Received code:", code);
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        console.log("✅ Tokens obtained successfully.");

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        console.log("Attempting to list events...");
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items;
        console.log(`✅ Successfully fetched ${events.length} events.`);

        if (events.length === 0) {
            console.log("⚠️ No events found. This might be correct if the calendar is empty.");
        } else {
            console.log("First event:", events[0].summary);
        }

        res.send(`
            <h1>Verification Success!</h1>
            <p>Found ${events.length} events.</p>
            <pre>${JSON.stringify(events, null, 2)}</pre>
        `);

        // Close server after success
        setTimeout(() => {
            console.log("Verification complete. Shutting down.");
            process.exit(0);
        }, 5000);

    } catch (error) {
        console.error("❌ Error during verification:", error);
        res.status(500).send(`<h1>Error</h1><pre>${error.stack}</pre>`);
    }
});

app.listen(PORT, () => {
    console.log(`Verification server running on http://localhost:${PORT}`);
    console.log(`Please visit http://localhost:${PORT} to start the test.`);
});
