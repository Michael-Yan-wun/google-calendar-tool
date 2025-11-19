/**
 * 對話歷史管理服務
 * 用於保存和管理用戶與 AI 的對話歷史，實現記憶功能
 */

// 使用內存存儲對話歷史（單用戶應用）
// 在生產環境中，應該使用數據庫或 Redis 等持久化存儲
let conversationHistory = [];

// 最大保留的對話輪數（避免 token 過多）
const MAX_HISTORY_LENGTH = 20; // 保留最近 20 輪對話

/**
 * 添加一輪對話到歷史記錄
 * @param {string} userMessage - 用戶訊息
 * @param {string} assistantMessage - AI 回應
 * @param {object} metadata - 可選的元數據（如 action, eventDetails 等）
 */
function addConversation(userMessage, assistantMessage, metadata = {}) {
    const conversation = {
        timestamp: new Date().toISOString(),
        user: userMessage,
        assistant: assistantMessage,
        metadata: metadata
    };
    
    conversationHistory.push(conversation);
    
    // 如果超過最大長度，移除最舊的對話
    if (conversationHistory.length > MAX_HISTORY_LENGTH) {
        conversationHistory.shift();
    }
    
    console.log(`💾 Conversation saved. Total history: ${conversationHistory.length} entries`);
}

/**
 * 獲取對話歷史
 * @param {number} limit - 限制返回的對話輪數（可選）
 * @returns {Array} 對話歷史陣列
 */
function getHistory(limit = null) {
    if (limit && limit > 0) {
        return conversationHistory.slice(-limit);
    }
    return [...conversationHistory]; // 返回副本，避免外部修改
}

/**
 * 獲取格式化的對話歷史（用於傳遞給 AI）
 * @param {number} limit - 限制返回的對話輪數（可選）
 * @returns {string} 格式化的對話歷史文字
 */
function getFormattedHistory(limit = null) {
    const history = getHistory(limit);
    
    if (history.length === 0) {
        return "（這是對話的開始，沒有之前的對話歷史）";
    }
    
    return history.map((conv, index) => {
        return `[對話 ${index + 1} - ${new Date(conv.timestamp).toLocaleString('zh-TW')}]
使用者: ${conv.user}
助理: ${conv.assistant}${conv.metadata.action ? ` (動作: ${conv.metadata.action})` : ''}`;
    }).join('\n\n');
}

/**
 * 清空對話歷史
 */
function clearHistory() {
    conversationHistory = [];
    console.log('🗑️ Conversation history cleared');
}

/**
 * 獲取歷史統計信息
 */
function getStats() {
    return {
        totalConversations: conversationHistory.length,
        oldestTimestamp: conversationHistory.length > 0 ? conversationHistory[0].timestamp : null,
        newestTimestamp: conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1].timestamp : null
    };
}

module.exports = {
    addConversation,
    getHistory,
    getFormattedHistory,
    clearHistory,
    getStats
};

