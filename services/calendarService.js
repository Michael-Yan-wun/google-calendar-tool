const { google } = require('googleapis');
const { oauth2Client } = require('./auth');

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

async function listEvents(timeMin, timeMax) {
    try {
        const params = {
            calendarId: 'primary',
            singleEvents: true,
            orderBy: 'startTime',
        };

        // 如果提供了時間範圍，使用它；否則獲取所有未來事件
        if (timeMin) {
            params.timeMin = timeMin;
        } else {
            params.timeMin = (new Date()).toISOString();
        }

        if (timeMax) {
            params.timeMax = timeMax;
        }

        // 移除 maxResults 限制，讓 Google Calendar API 返回所有符合條件的事件
        // 如果視圖範圍很大，API 會自動分頁，我們需要處理所有頁面
        let allEvents = [];
        let pageToken = null;

        do {
            if (pageToken) {
                params.pageToken = pageToken;
            }

            const res = await calendar.events.list(params);
            allEvents = allEvents.concat(res.data.items || []);

            pageToken = res.data.nextPageToken;
        } while (pageToken);

        return allEvents;
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
