const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function processUserIntent(userMessage, currentContext, conversationHistory = null) {
  // 使用常見的 Gemini 模型名稱，按優先順序
  // 如果第一個失敗，會在 catch 中處理
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  // 構建對話歷史部分
  let historySection = '';
  if (conversationHistory && conversationHistory.length > 0) {
    historySection = `
之前的對話歷史：
${conversationHistory}

請根據之前的對話內容來理解使用者的意圖。如果使用者提到「剛才」、「之前」、「那個」等詞彙，請參考對話歷史來理解。
`;
  } else {
    historySection = `
（這是對話的開始，沒有之前的對話歷史）
`;
  }

  const prompt = `
你是一個智慧行事曆助理。
現在時間: ${new Date().toISOString()}

${historySection}

使用者訊息: "${userMessage}"

目前行事曆狀況 (Context): ${JSON.stringify(currentContext, null, 2)}

分析使用者的需求並決定動作。
請回傳一個 JSON 物件，格式如下：
{
  "action": "list" | "insert" | "update" | "delete" | "check_conflict" | "unknown",
  "eventDetails": {
    "summary": "行程標題",
    "start": { "dateTime": "ISO String" },
    "end": { "dateTime": "ISO String" },
    "eventId": "如果是更新或刪除，請填入 ID"
  },
  "responseMessage": "用繁體中文自然語言回覆使用者",
  "requiresConfirmation": boolean
}

規則：
- 如果有行程衝突，請將 action 設為 "check_conflict" 並在 responseMessage 中建議替代方案。
- 如果是刪除或修改，請務必將 requiresConfirmation 設為 true。
- 如果是新增行程，也建議將 requiresConfirmation 設為 true 以便確認。
- 只回傳 JSON，不要包含任何其他文字或說明。
- 確保 JSON 格式正確，所有字串都要用雙引號。
- 如果無法理解使用者意圖，action 設為 "unknown"，responseMessage 用繁體中文說明。

重要：只回傳 JSON 物件，不要有任何前綴或後綴文字。
`;

  let text = null; // 在外部定義，以便在 catch 中使用
  
  try {
    console.log(`📤 Sending request to Gemini using model: ${modelName}...`);
    console.log(`📝 User message: "${userMessage}"`);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    text = response.text();
    
    console.log("📥 Raw Gemini response:", text);
    
    // 更強健的 JSON 提取
    let jsonString = text.trim();
    
    // 移除 markdown 代碼塊
    jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // 嘗試找到 JSON 物件（可能被其他文字包圍）
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }
    
    console.log("🔍 Extracted JSON string:", jsonString);
    
    const parsed = JSON.parse(jsonString);
    
    // 驗證必要的欄位
    if (!parsed.action || !parsed.responseMessage) {
      console.warn("⚠️ Response missing required fields:", parsed);
      return {
        action: parsed.action || "unknown",
        responseMessage: parsed.responseMessage || "無法理解您的需求，請再試一次。",
        requiresConfirmation: parsed.requiresConfirmation || false,
        eventDetails: parsed.eventDetails || {}
      };
    }
    
    console.log("✅ Successfully parsed response:", parsed);
    return parsed;
    
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // 如果是模型名稱錯誤，嘗試其他模型
    if (error.message && (error.message.includes('model') || error.message.includes('404'))) {
      console.log("⚠️ Model not found, trying alternative models...");
      const alternativeModels = ["gemini-2.5-flash", "gemini-2.0-flash-exp", "gemini-pro-latest"];
      for (const altModelName of alternativeModels) {
        if (altModelName === modelName) continue;
        try {
          console.log(`🔄 Trying model: ${altModelName}`);
          const altModel = genAI.getGenerativeModel({ model: altModelName });
          // 使用相同的 prompt（已包含對話歷史）
          const result = await altModel.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          let jsonString = text.trim();
          jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
          const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonString = jsonMatch[0];
          }
          
          const parsed = JSON.parse(jsonString);
          if (parsed.action && parsed.responseMessage) {
            console.log(`✅ Successfully used alternative model: ${altModelName}`);
            return parsed;
          }
        } catch (altError) {
          console.log(`⚠️ Alternative model ${altModelName} also failed`);
          continue;
        }
      }
    }
    
    // 如果是 JSON 解析錯誤，提供更詳細的錯誤訊息
    if (error instanceof SyntaxError) {
      console.error("JSON Parse Error - Response text might be:", typeof text !== 'undefined' ? text : 'N/A');
      return {
        action: "unknown",
        responseMessage: "抱歉，AI 回應格式有誤。請重新描述您的需求。"
      };
    }
    
    return {
      action: "unknown",
      responseMessage: "系統暫時無法處理您的請求，請稍後再試。如果問題持續，請檢查網路連線。"
    };
  }
}

module.exports = { processUserIntent };
