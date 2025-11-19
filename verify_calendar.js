const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

async function verifyCalendarSetup() {
    console.log("Testing Google Calendar Configuration...");

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.REDIRECT_URI;

    if (!clientId || !clientSecret) {
        console.error("❌ GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in .env");
        return;
    }
    console.log(`Client ID found: ${clientId.substring(0, 10)}...`);
    console.log(`Redirect URI: ${redirectUri}`);

    try {
        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        );
        console.log("✅ OAuth2 Client initialized successfully.");

        // Check if we can generate an auth URL (basic check)
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/calendar']
        });
        console.log("✅ Auth URL generation successful.");
    } catch (error) {
        console.error("❌ OAuth2 Client Initialization Failed:");
        console.error(error);
    }
}

verifyCalendarSetup();
