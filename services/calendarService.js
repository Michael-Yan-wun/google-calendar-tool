const { google } = require('googleapis');
const { oauth2Client } = require('../server');

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

async function listEvents() {
    try {
        const res = await calendar.events.list({
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 20,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return res.data.items;
    } catch (error) {
        console.error('The API returned an error: ' + error);
        throw error;
    }
}

async function insertEvent(event) {
    try {
        const res = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });
        return res.data;
    } catch (error) {
        console.error('Error contacting the Calendar service: ' + error);
        throw error;
    }
}

async function updateEvent(eventId, event) {
    try {
        const res = await calendar.events.patch({
            calendarId: 'primary',
            eventId: eventId,
            resource: event
        });
        return res.data;
    } catch (error) {
        console.error('Error updating event: ' + error);
        throw error;
    }
}

async function deleteEvent(eventId) {
    try {
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting event: ' + error);
        throw error;
    }
}

module.exports = { listEvents, insertEvent, updateEvent, deleteEvent };
