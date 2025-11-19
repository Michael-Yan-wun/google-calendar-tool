const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

async function verifyGemini() {
    console.log("Testing Gemini API...");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY is missing in .env");
        return;
    }
    console.log(`API Key found: ${apiKey.substring(0, 5)}...`);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        const text = response.text();
        console.log("✅ Gemini API Success!");
        console.log("Response:", text);
    } catch (error) {
        console.error("❌ Gemini API Failed:");
        console.error(error);
    }
}

verifyGemini();
