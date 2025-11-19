const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function processUserIntent(userMessage, currentContext) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
    You are a smart calendar assistant. 
    Current time: ${new Date().toISOString()}
    User Message: "${userMessage}"
    
    Context (Current Events): ${JSON.stringify(currentContext)}
    
    Analyze the user's request and determine the action.
    Return a JSON object with the following structure:
    {
      "action": "list" | "insert" | "update" | "delete" | "check_conflict" | "unknown",
      "eventDetails": {
        "summary": "Event Title",
        "start": { "dateTime": "ISO String" },
        "end": { "dateTime": "ISO String" },
        "eventId": "ID if update/delete"
      },
      "responseMessage": "Natural language response to user",
      "requiresConfirmation": boolean
    }
    
    If there is a conflict, set action to "check_conflict" and suggest alternatives in responseMessage.
    If deleting or modifying, set requiresConfirmation to true.
    Output ONLY JSON.
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
