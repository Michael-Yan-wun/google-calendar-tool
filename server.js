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
const { oauth2Client } = require('./services/auth');

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
const conversationService = require('./services/conversationService');

// Middleware to check if authenticated
const checkAuth = (req, res, next) => {
    if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
        return res.status(401).json({ error: 'User not authenticated. Please login.' });
    }
    next();
};

app.get('/api/calendar/events', checkAuth, async (req, res) => {
    try {
        // 從查詢參數獲取時間範圍
        const timeMin = req.query.timeMin || null;
        const timeMax = req.query.timeMax || null;
        const events = await calendarService.listEvents(timeMin, timeMax);
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/calendar/events', checkAuth, async (req, res) => {
    try {
        const event = await calendarService.insertEvent(req.body);
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/calendar/events/:id', checkAuth, async (req, res) => {
    try {
        const event = await calendarService.updateEvent(req.params.id, req.body);
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/calendar/events/:id', checkAuth, async (req, res) => {
    try {
        await calendarService.deleteEvent(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat', checkAuth, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        console.log(`💬 Received chat message: "${message}"`);
        
        // Fetch current context (events) to help Gemini understand "free time" or "conflicts"
        // 獲取未來 30 天的事件作為上下文
        const timeMin = new Date().toISOString();
        const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const currentEvents = await calendarService.listEvents(timeMin, timeMax);
        
        console.log(`📅 Found ${currentEvents.length} events in context`);
        
        // 獲取對話歷史（最近 10 輪對話，避免 token 過多）
        const conversationHistory = conversationService.getFormattedHistory(10);
        const historyStats = conversationService.getStats();
        console.log(`📚 Conversation history: ${historyStats.totalConversations} entries`);
        
        // 處理用戶意圖，傳入對話歷史
        const result = await geminiService.processUserIntent(message, currentEvents, conversationHistory);
        console.log(`✅ Chat response generated:`, result);
        
        // 保存對話到歷史記錄
        conversationService.addConversation(message, result.responseMessage, {
            action: result.action,
            eventDetails: result.eventDetails,
            requiresConfirmation: result.requiresConfirmation
        });
        
        res.json(result);
    } catch (error) {
        console.error('❌ Chat API Error:', error);
        res.status(500).json({ 
            error: error.message,
            action: 'unknown',
            responseMessage: '系統發生錯誤，請稍後再試。'
        });
    }
});

// 新增 API：清空對話歷史（可選功能）
app.post('/api/chat/clear', checkAuth, (req, res) => {
    try {
        conversationService.clearHistory();
        res.json({ success: true, message: '對話歷史已清空' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 新增 API：獲取對話歷史統計（可選功能）
app.get('/api/chat/history/stats', checkAuth, (req, res) => {
    try {
        const stats = conversationService.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Export oauth2Client for services to use (if we keep it singleton for this single-user tool)
// module.exports = { oauth2Client };
