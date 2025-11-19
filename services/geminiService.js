const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function processUserIntent(userMessage, currentContext) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    你是一個智慧行事曆助理。
    現在時間: ${new Date().toISOString()}
    使用者訊息: "${userMessage}"
    
    目前行事曆狀況 (Context): ${JSON.stringify(currentContext)}
    
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
    
    如果有行程衝突，請將 action 設為 "check_conflict" 並在 responseMessage 中建議替代方案。
    如果是刪除或修改，請務必將 requiresConfirmation 設為 true。
    如果是新增行程，也建議將 requiresConfirmation 設為 true 以便確認。
    只回傳 JSON。
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // Clean up markdown code blocks if present
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      action: "unknown",
      responseMessage: "Sorry, I'm having trouble understanding that right now."
    };
  }
}

module.exports = { processUserIntent };
