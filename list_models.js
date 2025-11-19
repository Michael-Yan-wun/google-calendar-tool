const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

async function listModels() {
    console.log("Listing available Gemini models...");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY is missing in .env");
        return;
    }

    try {
        // We can't directly list models via the SDK easily in all versions, 
        // but we can try a generic model and catch the error which might list them,
        // OR we can try to use the model we think exists and print more details.
        // Actually, the SDK doesn't have a listModels method exposed on the top level class in some versions.
        // Let's try a standard fetch to the API endpoint to be sure.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("✅ Available Models:");
            data.models.forEach(m => {
                if (m.name.includes("gemini")) {
                    console.log(`- ${m.name.replace('models/', '')} (${m.displayName})`);
                }
            });
        } else {
            console.error("❌ Could not list models:", data);
        }

    } catch (error) {
        console.error("❌ Error listing models:");
        console.error(error);
    }
}

listModels();
